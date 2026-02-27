const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes and handlers
const zoneRoutes = require('./routes/zoneRoutes');
const initializeSocketHandlers = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Production Environment Check
const isProduction = process.env.NODE_ENV === 'production';

// Allowed origins for CORS
const allowedOrigins = [
  'https://geo-guardian.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Simple rate limiting (in-memory)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = isProduction ? 100 : 1000;

app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const record = requestCounts.get(ip);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }
  
  record.count++;
  next();
});

// Clean up old rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 300000);

// MongoDB Connection with retry logic
const connectDB = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retries - 1);
    } else {
      console.error('Failed to connect to MongoDB after multiple attempts');
      process.exit(1);
    }
  }
};

connectDB();

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err.message);
});

// Mount zone routes
app.use('/api/zones', zoneRoutes);

// Initialize Socket.IO event handlers
initializeSocketHandlers(io);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Geo-Guardian API',
    status: 'active',
    version: '1.0.0',
    environment: isProduction ? 'production' : 'development'
  });
});

// Health check endpoint with DB status
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'active',
    database: 'disconnected'
  };
  
  try {
    if (mongoose.connection.readyState === 1) {
      health.database = 'connected';
      await mongoose.connection.db.admin().ping();
      res.status(200).json(health);
    } else {
      health.database = 'disconnected';
      res.status(503).json(health);
    }
  } catch (error) {
    health.database = 'error';
    res.status(503).json(health);
  }
});

// 404 handler - catch all undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: isProduction ? 'Something went wrong' : err.stack
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
});

const gracefulShutdown = async (signal) => {
  server.close(async () => {
    try {
      await mongoose.connection.close();
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
  
  setTimeout(() => {
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  if (isProduction) gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (isProduction) gracefulShutdown('UNCAUGHT_EXCEPTION');
});
