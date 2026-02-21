# 🚀 Production Deployment Checklist

## ✅ Pre-Deployment Tasks

### 1. Code Review
- [x] Security middleware implemented
- [x] Rate limiting configured
- [x] Error handling sanitized (no stack traces in production)
- [x] Input validation on all endpoints
- [x] CORS properly configured
- [x] Graceful shutdown handlers
- [x] Health check endpoint active

### 2. Database
- [ ] MongoDB Atlas cluster created
- [ ] Database name: `geoguardian`
- [ ] Network access configured (0.0.0.0/0 for serverless platforms)
- [ ] Database user created with proper permissions
- [ ] Connection string tested locally

### 3. Environment Configuration
- [x] `.env.example` file created
- [x] `.env` in .gitignore
- [x] `NODE_ENV=production` set
- [ ] MongoDB URI updated for production
- [ ] PORT configured (default: 5000)

### 4. Dependencies
- [x] All production dependencies in package.json
- [x] No vulnerable packages (`npm audit`)
- [x] Node.js version specified (>=16.0.0)

---

## 🌐 Domain & CORS Setup

### Update CORS Origins
In `index.js`, update the `allowedOrigins` array:

```javascript
const allowedOrigins = [
  'https://geo-guardian.netlify.app',  // Your production frontend
  'http://localhost:5173',              // Local dev (remove in production)
  'http://localhost:3000'               // Local dev (remove in production)
];
```

**Action Required**:
- [ ] Add your production frontend URL
- [ ] Remove localhost origins for production

---

## 📦 Platform Selection

Choose one deployment platform:

### Option 1: Render (Recommended) ⭐
- **Pros**: Free tier, auto-deploy, easy setup
- **Cons**: Cold starts on free tier
- **Best for**: Quick deployment, free hosting

### Option 2: Railway
- **Pros**: Fast, modern UI, generous free tier
- **Cons**: Requires credit card
- **Best for**: Professional projects

### Option 3: Heroku
- **Pros**: Well-documented, established
- **Cons**: No free tier anymore
- **Best for**: Established projects with budget

### Option 4: VPS (Advanced)
- **Pros**: Full control, no cold starts
- **Cons**: Requires server management
- **Best for**: High-traffic production apps

---

## 🔧 Deployment Steps (Render)

### Step 1: Prepare Repository
```bash
cd server
git add .
git commit -m "Production-ready server"
git push origin main
```

### Step 2: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub

### Step 3: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `geoguardian-api`
   - **Root Directory**: `GeoGuardian/server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 4: Environment Variables
Add these in Render dashboard:

| Key | Value | Example |
|-----|-------|---------|
| `NODE_ENV` | `production` | `production` |
| `MONGODB_URI` | Your Atlas connection string | `mongodb+srv://user:pass@...` |
| `PORT` | `5000` | `5000` |

### Step 5: Deploy
- Click "Create Web Service"
- Wait 2-5 minutes for deployment
- Note your deployment URL: `https://geoguardian-api.onrender.com`

### Step 6: Test Deployment
```bash
# Test health
curl https://geoguardian-api.onrender.com/health

# Test API
curl https://geoguardian-api.onrender.com/api/zones
```

---

## 🔍 Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-api-url.com/health
```

**Expected Response**:
```json
{
  "uptime": 123.45,
  "timestamp": "2026-02-21T...",
  "status": "active",
  "database": "connected"
}
```

### 2. API Endpoints
```bash
# Get zones
curl https://your-api-url.com/api/zones

# Create zone (test POST)
curl -X POST https://your-api-url.com/api/zones \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}}'
```

### 3. Socket.IO Connection
- Open frontend application
- Check browser console for Socket.IO connection
- Test danger alert functionality

### 4. Rate Limiting
```bash
# Run multiple requests quickly
for i in {1..150}; do curl https://your-api-url.com/api/zones; done
```
Should get 429 errors after 100 requests

### 5. CORS Verification
- Open frontend in browser
- Check Network tab for CORS errors
- All API requests should succeed

---

## 🔗 Update Frontend

After deployment, update Flutter app config:

**File**: `user/lib/config/app_config.dart`

```dart
class AppConfig {
  // Change this to your deployed server URL
  static const String baseUrl = 'https://geoguardian-api.onrender.com';
  
  // Rest of config...
}
```

**File**: `user/lib/services/socket_service.dart`

```dart
void connect() {
  _socket = IO.io(
    'https://geoguardian-api.onrender.com',  // Your deployed URL
    OptionBuilder()
      .setTransports(['websocket'])
      .build()
  );
}
```

---

## 📊 Monitoring Setup

### 1. Uptime Monitoring
Set up with **UptimeRobot** (free):
1. Go to https://uptimerobot.com
2. Add new monitor
3. URL: `https://your-api-url.com/health`
4. Interval: 5 minutes
5. Alert email: your-email@example.com

### 2. Log Monitoring
**Render**:
- Dashboard → Your Service → Logs
- Real-time log streaming

**Set up alerts for**:
- ❌ MongoDB disconnection
- ⚠️ Unhandled exceptions
- 🔒 CORS errors
- 📈 High request rates

---

## 🚨 Troubleshooting

### Issue: Server not starting
**Check**:
1. Render logs for errors
2. MongoDB URI is correct
3. Environment variables are set
4. Build command succeeded

**Solution**: Check build logs in Render dashboard

### Issue: Database connection failed
**Check**:
1. MongoDB Atlas → Network Access → IP Whitelist
2. Add `0.0.0.0/0` (allow all) for serverless platforms
3. Verify connection string format

**Solution**: Update IP whitelist in MongoDB Atlas

### Issue: CORS errors
**Check**:
1. Frontend URL in `allowedOrigins` array
2. No trailing slashes in URLs
3. Socket.IO CORS configuration

**Solution**: Update `index.js` with correct frontend URL

### Issue: Cold starts (Render free tier)
**Symptom**: First request after inactivity takes 30+ seconds
**Solution**: 
- Upgrade to paid tier, or
- Use cron job to ping server every 14 minutes

---

## 🎯 Performance Optimization

### 1. MongoDB Indexes (Already Configured)
- ✅ 2dsphere index on geometry
- ✅ Text index on name
- ✅ Compound index

### 2. Response Optimization
- ✅ Lean queries (no Mongoose overhead)
- ✅ Select only needed fields
- ✅ Limit query results

### 3. Connection Pooling
- ✅ Mongoose handles automatically
- Default pool size: 5

---

## 📈 Scaling Considerations

### When to Scale:
- > 1000 zones in database
- > 100 concurrent users
- > 10,000 requests/day

### Scaling Options:
1. **Render**: Upgrade to paid tier (no cold starts)
2. **MongoDB**: Increase cluster tier in Atlas
3. **CDN**: Add CloudFlare for API caching
4. **Load Balancer**: Multiple server instances

---

## ✅ Final Checklist

Before going live:

- [ ] Server deployed and accessible
- [ ] Health check returns 200
- [ ] Database connected
- [ ] All API endpoints tested
- [ ] Socket.IO working
- [ ] Rate limiting functional
- [ ] CORS configured correctly
- [ ] Frontend updated with new API URL
- [ ] Monitoring set up
- [ ] Logs reviewed for errors
- [ ] Load tested (basic)
- [ ] Documentation updated
- [ ] Team notified of deployment

---

## 🎉 Deployment Complete!

Your API URL: `https://_____________________.onrender.com`

**Next Steps**:
1. Update Flutter app with new URL
2. Deploy frontend to Netlify
3. Test end-to-end functionality
4. Monitor for 24 hours
5. Announce to users

---

**Support**: Check README.md for detailed troubleshooting
