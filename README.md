# Geo-Guardian Backend Server

**Production-ready Node.js backend server for the Geo-Guardian geofencing safety system.**

---

## Overview

The Geo-Guardian backend provides RESTful APIs and real-time WebSocket communication for managing danger zones and alerting systems. It serves both the web-based admin dashboard and mobile tourist application.

### Related Repositories

- **Admin Dashboard (Web)**: [https://github.com/MAHAVEER-IT/Geo-Guardian.git](https://github.com/MAHAVEER-IT/Geo-Guardian.git)
- **Mobile Application (Flutter)**: [https://github.com/MAHAVEER-IT/Geo-Guardian-App.git](https://github.com/MAHAVEER-IT/Geo-Guardian-App.git)

---

## Technology Stack

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO
- **Security**: CORS, Rate Limiting, Security Headers

---

## Features

### Security
- CORS with whitelisted origins
- Security headers (X-Frame-Options, XSS Protection, HSTS)
- Request size limits (10MB)
- Rate limiting (100 requests/minute in production)
- Input validation and sanitization
- Safe error handling (no stack traces in production)

### Reliability
- MongoDB connection retry logic (5 attempts)
- Graceful shutdown handling
- Connection monitoring and auto-reconnect
- Health check endpoint
- Unhandled rejection and exception handlers

### Performance
- Geospatial indexes (2dsphere) for fast location queries
- Mongoose lean queries
- Connection pooling
- Efficient rate limit cleanup

### Monitoring
- Health check at `/health` with database status
- Error logging
- Production/development environment detection

---

## Quick Start

### Prerequisites

- Node.js v16.0.0 or higher
- MongoDB Atlas account or local MongoDB instance
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MAHAVEER-IT/Geo-Guardian.git
   cd Geo-Guardian/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the server directory:
   ```env
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/geoguardian
   PORT=5000
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm start

   # Production mode
   NODE_ENV=production npm start
   ```

5. **Verify installation**
   
   Open your browser and navigate to:
   - Server info: `http://localhost:5000`
   - Health check: `http://localhost:5000/health`

---

## API Documentation

### Base URL
```
Development: http://localhost:5000
Production: https://your-domain.com
```

### Endpoints

#### Server Status

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/` | Server information | `{ message, status, version, environment }` |
| `GET` | `/health` | Health check with DB status | `{ uptime, timestamp, status, database }` |

#### Zone Management

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| `GET` | `/api/zones` | Retrieve all danger zones | - |
| `POST` | `/api/zones` | Create a new danger zone | `{ name, geometry }` |
| `DELETE` | `/api/zones/:id` | Delete a specific zone | - |

#### Geospatial Queries

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/zones/nearby` | Get zones near a location | `lat, lng, maxDistance` (query) |
| `POST` | `/api/zones/check` | Check if point is in danger zone | `{ lat, lng }` (body) |
| `GET` | `/api/zones/within` | Get zones in bounding box | `minLat, minLng, maxLat, maxLng` (query) |

### Request Examples

#### Create a Danger Zone
```bash
POST /api/zones
Content-Type: application/json

{
  "name": "Construction Area",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [77.5946, 12.9716],
        [77.5956, 12.9716],
        [77.5956, 12.9726],
        [77.5946, 12.9726],
        [77.5946, 12.9716]
      ]
    ]
  }
}
```

#### Check if Location is in Danger Zone
```bash
POST /api/zones/check
Content-Type: application/json

{
  "lat": 12.9716,
  "lng": 77.5946
}
```

#### Get Nearby Zones
```bash
GET /api/zones/nearby?lat=12.9716&lng=77.5946&maxDistance=5000
```

### Response Format

All API responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Socket.IO Events

### Client → Server

**Event:** `mobile_danger_alert`

Emitted when a mobile user enters a danger zone.

```javascript
socket.emit('mobile_danger_alert', {
  message: 'User entered danger zone',
  location: { lat: 12.9716, lng: 77.5946 },
  userId: 'user123',
  timestamp: '2026-02-27T10:30:00Z'
});
```

### Server → Client

**Event:** `admin_alert`

Broadcasted to all connected admin clients when a danger alert is received.

```javascript
socket.on('admin_alert', (data) => {
  console.log(data);
  // {
  //   message: 'Tourist entered Danger Zone',
  //   location: { lat: 12.9716, lng: 77.5946 },
  //   timestamp: '2026-02-27T10:30:00Z',
  //   severity: 'critical'
  // }
});
```

---

## Production Deployment

### Environment Variables

Required variables for production:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/geoguardian?retryWrites=true&w=majority
PORT=5000
```

**Important:** Never commit `.env` files to version control.

### Deployment Platforms

#### Option 1: Render (Recommended)

1. Create account at [https://render.com](https://render.com)
2. Create new Web Service from GitHub repository
3. Configuration:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables in Render dashboard
5. Deploy

#### Option 2: Railway

1. Create account at [https://railway.app](https://railway.app)
2. Create new project from GitHub
3. Set environment variables
4. Railway auto-detects and deploys

#### Option 3: Heroku

```bash
heroku login
heroku create geoguardian-api
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
git push heroku main
```

#### Option 4: VPS (DigitalOcean, AWS EC2)

```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone https://github.com/MAHAVEER-IT/Geo-Guardian.git
cd Geo-Guardian/server
npm install --production

# Install PM2
sudo npm install -g pm2
pm2 start index.js --name geoguardian-server
pm2 startup
pm2 save

# Setup Nginx reverse proxy and SSL
```

### MongoDB Atlas Setup

1. Create cluster at [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Create database user
3. Whitelist IP addresses:
   - For serverless deployments (Render, Railway): `0.0.0.0/0`
   - For VPS: Your server's IP address
4. Copy connection string and update `MONGODB_URI`

### CORS Configuration

Update the `allowedOrigins` array in `index.js`:

```javascript
const allowedOrigins = [
  'https://your-frontend-domain.com',
  'http://localhost:5173',
  'http://localhost:3000'
];
```

---

## Testing

### Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "uptime": 123.456,
  "timestamp": "2026-02-27T10:30:00.000Z",
  "status": "active",
  "database": "connected"
}
```

### Rate Limiting Test
```bash
# Should trigger rate limit after 100 requests
for i in {1..150}; do curl http://localhost:5000/api/zones; done
```

---

## Project Structure

```
server/
├── index.js                # Main server entry point
├── models/
│   └── Zone.js            # MongoDB schema for danger zones
├── routes/
│   └── zoneRoutes.js      # Zone API endpoints
├── socket/
│   └── socketHandler.js   # Socket.IO event handlers
├── .env.example           # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## Monitoring & Maintenance

### Health Monitoring

Set up external monitoring using:
- **UptimeRobot**: [https://uptimerobot.com](https://uptimerobot.com)
- **Pingdom**: [https://www.pingdom.com](https://www.pingdom.com)

Monitor endpoint: `https://your-domain.com/health`

### Logs

**Platform-specific log access:**
- Render: Dashboard → Logs tab
- Railway: Project → Deployments → Logs
- Heroku: `heroku logs --tail`
- VPS with PM2: `pm2 logs geoguardian-server`

### Database Maintenance

- Monitor MongoDB Atlas metrics
- Set up automated backups
- Review slow queries
- Check index usage

---

## Troubleshooting

### Cannot Connect to MongoDB

**Symptoms:** Server fails to start or crashes with connection errors

**Solutions:**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist
- Ensure database user has correct permissions
- Check network connectivity

### CORS Errors from Frontend

**Symptoms:** Browser console shows CORS policy errors

**Solutions:**
- Add frontend domain to `allowedOrigins` in `index.js`
- Ensure credentials are enabled in frontend requests
- Redeploy server after changes

### Rate Limit Too Restrictive

**Symptoms:** Clients receiving 429 (Too Many Requests) errors

**Solutions:**
- Increase `MAX_REQUESTS` constant in `index.js`
- Adjust `RATE_LIMIT_WINDOW` duration
- Implement per-user rate limiting instead of per-IP

### Socket.IO Connection Failed

**Symptoms:** Real-time alerts not working

**Solutions:**
- Verify Socket.IO client uses correct server URL
- Check CORS configuration includes Socket.IO origin
- Ensure WebSocket protocol is allowed by hosting platform

---

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Database Security**: Use strong passwords, enable IP whitelist
3. **Dependencies**: Run `npm audit fix` regularly
4. **HTTPS**: Always use SSL certificates in production
5. **Monitoring**: Set up alerts for unusual activity
6. **Backups**: Configure automated database backups
7. **Access Control**: Limit database user permissions

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/improvement`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Support

For issues and questions:
- **GitHub Issues**: [Geo-Guardian Issues](https://github.com/MAHAVEER-IT/Geo-Guardian/issues)
- **Email**: support@geoguardian.com (if applicable)

---

## Deployment Verification Checklist

After deployment, verify:

- [ ] Health check returns 200 status code
- [ ] Database connection shows "connected"
- [ ] GET `/api/zones` returns data or empty array
- [ ] Socket.IO connects successfully from client
- [ ] CORS allows frontend requests
- [ ] Rate limiting is functional
- [ ] Error responses don't expose sensitive information
- [ ] Environment is set to "production"

---

**Server Version:** 1.0.0  
**Last Updated:** February 2026
