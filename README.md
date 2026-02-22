# 🛡️ Geo-Guardian Server - Production Deployment Guide

## 🚀 Production-Ready Features

### ✅ Security
- ✅ CORS configuration with whitelisted origins
- ✅ Security headers (X-Frame-Options, X-XSS-Protection, CSP)
- ✅ Request body size limits (10MB)
- ✅ Rate limiting (100 req/min in production)
- ✅ Input validation and sanitization
- ✅ Error message sanitization (no stack traces in production)

### ✅ Reliability
- ✅ MongoDB connection retry logic (5 attempts)
- ✅ Graceful shutdown handling
- ✅ Connection event monitoring
- ✅ Health check endpoint with DB status
- ✅ Unhandled rejection and exception handlers

### ✅ Performance
- ✅ Geospatial indexes (2dsphere)
- ✅ Lean queries for better performance
- ✅ Connection pooling
- ✅ Efficient rate limiting cleanup

### ✅ Monitoring
- ✅ Request logging with timestamps and IP
- ✅ Error logging
- ✅ Health check at `/health`
- ✅ Database connection status monitoring

---

## 📋 Pre-Deployment Checklist

- [ ] MongoDB Atlas cluster created and accessible
- [ ] Environment variables configured
- [ ] CORS origins updated for production domain
- [ ] Node.js version >= 16.0.0
- [ ] All dependencies installed
- [ ] Health check endpoint tested

---

## 🌍 Deployment Options

### Option 1: Render (Recommended)

1. **Create Render Account**: https://render.com
2. **Create New Web Service**:
   - Connect GitHub repository
   - Select `server` folder as root directory
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables** (in Render Dashboard):
   ```
   NODE_ENV=production
   MONGODB_URI= YOUR_MONGODB_URI
   PORT=5000
   ```

4. **Deploy**: Render will auto-deploy on every push to main branch

### Option 2: Railway

1. **Create Railway Account**: https://railway.app
2. **New Project** → **Deploy from GitHub**
3. **Set Environment Variables**:
   - `NODE_ENV=production`
   - `MONGODB_URI=your_mongodb_uri`
   - `PORT=5000`

4. **Deploy**: Railway auto-detects and deploys

### Option 3: Heroku

1. **Install Heroku CLI**
2. **Commands**:
   ```bash
   heroku login
   heroku create geoguardian-api
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your_mongodb_uri
   git push heroku main
   ```

### Option 4: VPS (DigitalOcean, AWS EC2, Linode)

1. **SSH into server**
2. **Install Node.js and npm**
3. **Clone repository**
4. **Install dependencies**: `npm install --production`
5. **Set up PM2** (Process Manager):
   ```bash
   npm install -g pm2
   pm2 start index.js --name geoguardian-server
   pm2 startup
   pm2 save
   ```
6. **Configure nginx** as reverse proxy
7. **Set up SSL** with Let's Encrypt

---

## ⚙️ Environment Variables

Create a `.env` file (use `.env.example` as template):

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/geoguardian?retryWrites=true&w=majority
PORT=5000
```

**Important**: Never commit `.env` file to Git!

---

## 🧪 Testing Before Deployment

### 1. Test Locally in Production Mode
```bash
NODE_ENV=production npm start
```

### 2. Test Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "uptime": 123.456,
  "timestamp": "2026-02-21T...",
  "status": "active",
  "database": "connected"
}
```

### 3. Test API Endpoints
```bash
# Get all zones
curl http://localhost:5000/api/zones

# Health check
curl http://localhost:5000/health

# Create zone (POST)
curl -X POST http://localhost:5000/api/zones \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Zone","geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}}'
```

### 4. Test Rate Limiting
Run this multiple times quickly (should hit rate limit):
```bash
for i in {1..150}; do curl http://localhost:5000/api/zones; done
```

---

## 🔒 Security Best Practices

1. **Never expose .env file** - Already in .gitignore
2. **Use strong MongoDB passwords**
3. **Enable MongoDB IP whitelist** (or allow all IPs: 0.0.0.0/0 for serverless)
4. **Keep dependencies updated**: `npm audit fix`
5. **Monitor logs** regularly
6. **Set up alerts** for downtime

---

## 📊 Monitoring After Deployment

### Health Checks
- **Endpoint**: `https://your-domain.com/health`
- **Check**: Database connectivity, uptime
- **Set up external monitoring**: UptimeRobot, Pingdom

### Logs
- **Render**: View logs in dashboard
- **Railway**: View logs in project dashboard
- **Heroku**: `heroku logs --tail`
- **VPS/PM2**: `pm2 logs geoguardian-server`

---

## 🚨 Common Issues & Solutions

### Issue 1: "Cannot connect to MongoDB"
**Solution**: 
- Check MongoDB URI is correct
- Verify IP whitelist in MongoDB Atlas (allow 0.0.0.0/0 for Render/Railway)
- Check network connectivity

### Issue 2: "CORS error from frontend"
**Solution**: 
- Update `allowedOrigins` array in index.js with your frontend domain
- Example: `'https://your-frontend.netlify.app'`

### Issue 3: "Rate limit too restrictive"
**Solution**: 
- Adjust `MAX_REQUESTS` constant in index.js
- Or disable rate limiting for trusted origins

### Issue 4: "Port already in use"
**Solution**: 
- Change PORT in .env
- Or use: `PORT=3000 npm start`

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server info |
| GET | `/health` | Health check with DB status |
| GET | `/api/zones` | Get all zones |
| POST | `/api/zones` | Create zone |
| DELETE | `/api/zones/:id` | Delete zone |
| GET | `/api/zones/nearby` | Get nearby zones (geospatial) |
| POST | `/api/zones/check` | Check if point in zone |
| GET | `/api/zones/within` | Get zones in bounding box |

---

## 🔄 Updating Production

### Auto-deploy (Render/Railway/Heroku)
1. Push to GitHub main branch
2. Platform auto-deploys

### Manual (VPS)
```bash
ssh user@server
cd geoguardian-server
git pull
npm install --production
pm2 restart geoguardian-server
```

---

## 📞 Support

For issues, check:
1. Server logs
2. MongoDB Atlas metrics
3. Health check endpoint
4. Network connectivity

---

## ✅ Deployment Verification

After deployment, verify:

- [ ] Health check returns 200 status
- [ ] Database shows "connected"
- [ ] `/api/zones` returns data
- [ ] Socket.IO connects successfully
- [ ] CORS allows frontend requests
- [ ] Rate limiting works
- [ ] Error handling doesn't expose sensitive info

---

**🎉 Your server is production-ready!**
