const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

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

// ==================== SECURITY MIDDLEWARE ====================

// CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  Blocked CORS request from: ${origin}`);
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

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
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

// ==================== DATABASE CONNECTION ====================

// MongoDB Connection with retry logic
const connectDB = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connected Successfully');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    
    if (retries > 0) {
      console.log(`🔄 Retrying connection... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retries - 1);
    } else {
      console.error('❌ Failed to connect to MongoDB after multiple attempts');
      process.exit(1);
    }
  }
};

connectDB();

// MongoDB connection event handlers
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

// Import Zone Model
const Zone = require('./models/Zone');

// ==================== REST API ROUTES ====================

// POST /api/zones - Create a new danger zone
app.post('/api/zones', async (req, res) => {
  try {
    const { name, geometry } = req.body;
    
    // Input validation
    if (!name || !geometry) {
      return res.status(400).json({
        success: false,
        message: 'Name and geometry are required'
      });
    }
    
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid zone name'
      });
    }
    
    const newZone = new Zone({
      name: name.trim(),
      geometry
    });
    
    await newZone.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Zone created successfully', 
      zone: newZone 
    });
  } catch (error) {
    console.error('Error creating zone:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid zone data', 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create zone',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// GET /api/zones - Get all danger zones
app.get('/api/zones', async (req, res) => {
  try {
    const zones = await Zone.find().select('-__v').lean();
    
    res.status(200).json({ 
      success: true,
      count: zones.length,
      zones 
    });
  } catch (error) {
    console.error('Error fetching zones:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch zones',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// GET /api/zones/nearby - Get zones near a specific location
app.get('/api/zones/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query; // maxDistance in meters
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }

    // Use $near operator with geospatial index
    const zones = await Zone.find({
      geometry: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      count: zones.length,
      zones 
    });
  } catch (error) {
    console.error('Error finding nearby zones:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to find nearby zones',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// POST /api/zones/check - Check if a point is inside any danger zone
app.post('/api/zones/check', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }

    // Use $geoIntersects to check if point is within any zone
    const zones = await Zone.find({
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          }
        }
      }
    });

    const isInDangerZone = zones.length > 0;

    res.status(200).json({ 
      success: true, 
      isInDangerZone,
      dangerousZones: zones,
      message: isInDangerZone 
        ? `Warning: Inside ${zones.length} danger zone(s)` 
        : 'Location is safe'
    });
  } catch (error) {
    console.error('Error checking location:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check location',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// GET /api/zones/within - Get zones within a specific area (bounding box)
app.get('/api/zones/within', async (req, res) => {
  try {
    const { minLat, minLng, maxLat, maxLng } = req.query;
    
    if (!minLat || !minLng || !maxLat || !maxLng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bounding box coordinates required (minLat, minLng, maxLat, maxLng)' 
      });
    }

    // Use $geoWithin with $box operator
    const zones = await Zone.find({
      geometry: {
        $geoWithin: {
          $box: [
            [parseFloat(minLng), parseFloat(minLat)], // bottom-left
            [parseFloat(maxLng), parseFloat(maxLat)]  // top-right
          ]
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      count: zones.length,
      zones 
    });
  } catch (error) {
    console.error('Error finding zones within area:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to find zones within area',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// DELETE /api/zones/:id - Delete a danger zone
app.delete('/api/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedZone = await Zone.findByIdAndDelete(id);
    
    if (!deletedZone) {
      return res.status(404).json({ 
        success: false, 
        message: 'Zone not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Zone deleted successfully', 
      zone: deletedZone 
    });
  } catch (error) {
    console.error('Error deleting zone:', error.message);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid zone ID format'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete zone',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// ==================== SOCKET.IO RELAY LOGIC ====================

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Listen for mobile danger alerts
  socket.on('mobile_danger_alert', (data) => {
    console.log('⚠️  DANGER ALERT RECEIVED:', data);
    
    // Broadcast to all connected admin clients
    io.emit('admin_alert', {
      message: data.message || 'Tourist entered Danger Zone',
      location: data.location || null,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    });
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ==================== HEALTH CHECK & STATUS ====================

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
  console.error('❌ Unhandled error:', err.message);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: isProduction ? 'Something went wrong' : err.stack
  });
});

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🛡️  GEO-GUARDIAN SERVER');
  console.log('='.repeat(50));
  console.log(`🚀 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO: Active`);
  console.log('='.repeat(50) + '\n');
});

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to crash and restart
  if (isProduction) {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // In production, crash and let process manager restart
  if (isProduction) {
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  }
});
