# Quick Start Guide

Get the World Congress Agenda Manager running in **5 minutes**.

## Prerequisites

✅ Node.js 20+  
✅ Docker Desktop (or MongoDB + Redis installed locally)

## Steps

### 1. Install Dependencies

```bash
cd World-congress-GenAI-and-Quantum-Boosted
npm install
```

### 2. Start Database Services

```bash
# Start MongoDB and Redis with Docker
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env (optional - defaults work for local development)
# Add OPENAI_API_KEY if you want AI-powered qualification
```

### 4. Generate Test Data

```bash
npm run generate-data
```

This creates:
- `data/output/requests.json` (120 meeting requests)
- `data/output/hosts.json` (15 hosts with availability)
- `data/output/statistics.json` (data statistics)

### 5. Start the Application

```bash
# Start both backend and frontend
npm run dev
```

Or start them separately:

```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Frontend UI
npm run dev:frontend
```

### 6. Import Synthetic Data

```bash
# Wait for backend to start, then import data
curl -X POST http://localhost:3001/api/requests/bulk \
  -H "Content-Type: application/json" \
  -d @data/output/requests.json

curl -X POST http://localhost:3001/api/hosts/bulk \
  -H "Content-Type: application/json" \
  -d @data/output/hosts.json
```

Or use the import script:

```bash
node scripts/import-data.js
```

## Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **API Health Check**: http://localhost:3001/api/health
- **MongoDB Express**: http://localhost:8081 (admin/admin123)
- **RedisInsight**: http://localhost:8001

## Test the API

### Get all requests
```bash
curl http://localhost:3001/api/requests
```

### Qualify a request
```bash
curl -X POST http://localhost:3001/api/qualification/qualify/req_0001
```

### Run scheduler optimization
```bash
curl -X POST http://localhost:3001/api/schedule/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "requestIds": ["req_0001", "req_0002"],
    "constraints": {
      "eventStartDate": "2025-11-15",
      "eventEndDate": "2025-11-19",
      "workingHoursStart": "09:00",
      "workingHoursEnd": "18:00",
      "meetingDurationMinutes": 30,
      "maxMeetingsPerDay": 8
    },
    "algorithm": "hybrid"
  }'
```

## Troubleshooting

### Port already in use
```bash
# Check what's using the port
lsof -i :3001  # Backend
lsof -i :3000  # Frontend

# Change ports in .env
PORT=3002
```

### MongoDB connection error
```bash
# Check if MongoDB is running
docker-compose ps

# Restart services
docker-compose restart mongodb
```

### Redis connection error
```bash
# Check if Redis is running
docker-compose ps

# Restart services
docker-compose restart redis
```

### Frontend build errors
```bash
# Clear Next.js cache
rm -rf frontend/.next
npm run dev:frontend
```

## Next Steps

1. **Explore the Dashboard**: Open http://localhost:3000
2. **Review API Docs**: See [docs/API.md](./docs/API.md)
3. **Read Architecture**: See [README.md](./README.md)
4. **Check Project Status**: See [PROJECT_STATUS.md](./PROJECT_STATUS.md)

## Stop Services

```bash
# Stop development servers
# Press Ctrl+C in the terminals

# Stop Docker services
docker-compose down

# Or keep data and just stop
docker-compose stop
```

## Clean Start

```bash
# Remove all data and start fresh
docker-compose down -v
rm -rf data/output
npm run generate-data
npm run dev
```

---

**Ready to build?** Check out the [SETUP.md](./SETUP.md) for detailed configuration options.
