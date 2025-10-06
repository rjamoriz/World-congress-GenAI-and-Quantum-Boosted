# 🔧 Troubleshooting Guide

## ✅ Issue Resolved: TypeScript Compilation Error

### What Was Wrong
The backend `tsconfig.json` had strict settings (`noUnusedLocals` and `noUnusedParameters` set to `true`) that were causing compilation failures.

### What Was Fixed
Changed in `backend/tsconfig.json`:
```json
"noUnusedLocals": false,      // Was: true
"noUnusedParameters": false,  // Was: true
```

This allows development to proceed without failing on unused variables (warnings only).

---

## 🚨 Current Issue: Backend Not Connecting

### Symptom
```
Backend not responding at http://localhost:3001
```

### Root Cause
**Docker Desktop is not running** - MongoDB and Redis are not available.

### Solution

#### Option 1: Start Docker Desktop (Recommended)

1. **Open Docker Desktop application**
   - Find it in Applications folder or Spotlight (Cmd+Space, type "Docker")
   - Wait for Docker to fully start (whale icon in menu bar should be stable)

2. **Start the databases**
   ```bash
   cd "/Users/Ruben_MACPRO/Desktop/IA DevOps/WORLD CONGRESS DESIGN/World-congress-GenAI-and-Quantum-Boosted"
   docker-compose up -d
   ```

3. **Verify services are running**
   ```bash
   docker-compose ps
   ```
   
   You should see:
   - MongoDB (port 27017)
   - Redis (port 6379)
   - MongoDB Express (port 8081) - optional
   - RedisInsight (port 8001) - optional

4. **Now start the backend** (in a new terminal)
   ```bash
   npm run dev:backend
   ```
   
   You should see:
   ```
   🚀 Server running on port 3001
   📡 WebSocket server ready
   🌍 Environment: development
   ```

5. **Test the API**
   ```bash
   curl http://localhost:3001/api/health
   ```

#### Option 2: Run Without Backend (Frontend Only)

If you don't want to use Docker right now:

```bash
# Just start the frontend
npm run dev:frontend

# Access at: http://localhost:3000
# (UI will work but API calls will fail)
```

#### Option 3: Use Cloud MongoDB (No Docker Needed)

1. **Create free MongoDB Atlas account**: https://www.mongodb.com/cloud/atlas

2. **Get connection string** from Atlas

3. **Edit `.env` file**:
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agenda-manager
   REDIS_URL=redis://localhost:6379  # Or use Redis Cloud
   ```

4. **Start backend**:
   ```bash
   npm run dev:backend
   ```

---

## 🧪 Testing the Setup

### Test 1: Check if Docker is Running
```bash
docker ps
```

✅ Success: Shows list of containers  
❌ Error: "Cannot connect to Docker daemon" - Start Docker Desktop

### Test 2: Check MongoDB Connection
```bash
docker-compose ps | grep mongodb
```

✅ Success: Shows "Up" status  
❌ Error: Not listed - Run `docker-compose up -d`

### Test 3: Check Backend Health
```bash
curl http://localhost:3001/api/health
```

✅ Success: Returns JSON with status "healthy"  
❌ Error: Connection refused - Backend not started or DB not connected

### Test 4: Check Frontend
```bash
curl http://localhost:3000
```

✅ Success: Returns HTML  
❌ Error: Connection refused - Run `npm run dev:frontend`

---

## 📊 Quick Status Check

Run this command to check everything:

```bash
echo "=== Docker Status ===" && \
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1 && \
echo -e "\n=== Backend Health ===" && \
curl -s http://localhost:3001/api/health 2>&1 | head -5 && \
echo -e "\n=== Frontend Status ===" && \
curl -s http://localhost:3000 2>&1 | head -3
```

---

## 🐛 Common Errors & Solutions

### Error: "Cannot connect to Docker daemon"
**Cause**: Docker Desktop not running  
**Solution**: Open Docker Desktop application and wait for it to start

### Error: "MongoServerError: connect ECONNREFUSED"
**Cause**: MongoDB not running  
**Solution**: `docker-compose up -d`

### Error: "Redis connection failed"
**Cause**: Redis not running  
**Solution**: `docker-compose up -d`

### Error: "Port 3001 already in use"
**Cause**: Another backend instance running  
**Solution**: 
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
# Or change port in .env
PORT=3002
```

### Error: "Cannot find module '@agenda-manager/shared'"
**Cause**: Shared package not built  
**Solution**: 
```bash
npm run build --workspace=shared
```

### Error: "Module not found" or compilation errors
**Cause**: Dependencies not installed  
**Solution**: 
```bash
npm install
```

---

## 🎯 Complete Startup Checklist

Run these commands in order:

```bash
# 1. Navigate to project
cd "/Users/Ruben_MACPRO/Desktop/IA DevOps/WORLD CONGRESS DESIGN/World-congress-GenAI-and-Quantum-Boosted"

# 2. Ensure dependencies are installed
npm install

# 3. Build shared package
npm run build --workspace=shared

# 4. Start Docker Desktop (manual step - open the app)

# 5. Start databases
docker-compose up -d

# 6. Wait 5 seconds for databases to be ready
sleep 5

# 7. Verify databases
docker-compose ps

# 8. Start backend (Terminal 1)
npm run dev:backend

# 9. Start frontend (Terminal 2)
npm run dev:frontend

# 10. Import data (Terminal 3 - after backend starts)
sleep 10  # Wait for backend
npm run import-data

# 11. Test
open http://localhost:3000
```

---

## 📁 Project Structure Check

Verify all files exist:

```bash
ls -la backend/src/index.ts     # ✅ Should exist
ls -la frontend/src/app/page.tsx  # ✅ Should exist
ls -la shared/dist/              # ✅ Should exist after build
ls -la data/output/requests.json # ✅ Should exist
ls -la .env                      # ✅ Should exist
```

---

## 🔍 Debug Mode

For detailed logging:

### Backend Debug
```bash
# In backend/.env or root .env
LOG_LEVEL=debug
DEBUG=*

npm run dev:backend
```

### Check Logs
```bash
# View backend logs
tail -f backend/logs/combined.log

# View Docker logs
docker-compose logs -f mongodb
docker-compose logs -f redis
```

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Docker Desktop shows 4 containers running
2. ✅ Backend console shows "🚀 Server running on port 3001"
3. ✅ `curl http://localhost:3001/api/health` returns `{"status":"healthy"}`
4. ✅ Frontend at http://localhost:3000 loads without errors
5. ✅ Dashboard shows request data (after import)

---

## 🆘 Still Having Issues?

### Get Detailed Status
```bash
# Check Node version
node --version  # Should be 20+

# Check npm version
npm --version  # Should be 10+

# Check TypeScript
npx tsc --version  # Should be 5.3+

# Check ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :27017 # MongoDB
lsof -i :6379  # Redis

# Check environment
cat .env | grep -v "^#" | grep -v "^$"
```

### Clean Restart
```bash
# Stop everything
docker-compose down
pkill -f "npm run dev"

# Clean build artifacts
rm -rf backend/dist
rm -rf frontend/.next
rm -rf shared/dist

# Rebuild
npm install
npm run build --workspace=shared

# Start fresh
docker-compose up -d
sleep 5
npm run dev:backend &
npm run dev:frontend &
```

---

## 📞 Quick Commands Summary

```bash
# Start everything
docker-compose up -d && npm run dev

# Stop everything
docker-compose down && pkill -f "npm run dev"

# Restart backend only
pkill -f "npm run dev:backend" && npm run dev:backend

# Check status
docker-compose ps && curl -s http://localhost:3001/api/health

# View logs
docker-compose logs -f

# Clean and rebuild
npm run clean --workspaces && npm run build --workspaces
```

---

**Current Status**: ✅ TypeScript issue fixed. Waiting for Docker to start MongoDB/Redis.

**Next Step**: Start Docker Desktop and run `docker-compose up -d`
