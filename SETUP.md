# Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Python** 3.11+ (for optimization services)
- **MongoDB** 7+ ([Download](https://www.mongodb.com/try/download/community))
- **Redis** 7+ ([Download](https://redis.io/download))
- **Docker & Docker Compose** (recommended)

## Quick Start with Docker

The fastest way to get started is using Docker Compose:

```bash
# 1. Clone the repository (already done)
cd World-congress-GenAI-and-Quantum-Boosted

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env and add your API keys
nano .env  # or use your preferred editor

# 4. Start MongoDB and Redis with Docker
docker-compose up -d

# 5. Install dependencies
npm install

# 6. Generate synthetic data
npm run generate-data

# 7. Start the development servers
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MongoDB Express**: http://localhost:8081 (admin/admin123)
- **RedisInsight**: http://localhost:8001

## Manual Setup (Without Docker)

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

### 2. Set Up MongoDB

```bash
# Start MongoDB (if installed locally)
mongod --dbpath /path/to/your/data/directory

# Or use MongoDB Atlas (cloud)
# Get connection string from: https://www.mongodb.com/cloud/atlas
```

### 3. Set Up Redis

```bash
# Start Redis (if installed locally)
redis-server

# Or use Redis Cloud
# Get connection string from: https://redis.com/try-free/
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and configure the following required variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/agenda-manager
REDIS_URL=redis://localhost:6379

# OpenAI (Required for GenAI features)
OPENAI_API_KEY=sk-your-key-here

# JWT (Generate a secure random string)
JWT_SECRET=your-super-secret-key-here

# Optional: D-Wave Quantum Computing
DWAVE_API_TOKEN=your-token-here
ENABLE_QUANTUM=false
```

### 5. Generate Synthetic Data

```bash
npm run generate-data
```

This will create:
- `data/output/requests.json` - 120 meeting requests
- `data/output/hosts.json` - 15 host profiles
- `data/output/statistics.json` - Data statistics

### 6. Start Development Servers

```bash
# Option 1: Start all services together
npm run dev

# Option 2: Start services separately
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## Importing Synthetic Data

Once the backend is running, import the generated data:

```bash
# Import requests
curl -X POST http://localhost:3001/api/requests/bulk \
  -H "Content-Type: application/json" \
  -d @data/output/requests.json

# Import hosts
curl -X POST http://localhost:3001/api/hosts/bulk \
  -H "Content-Type: application/json" \
  -d @data/output/hosts.json
```

Or use a REST client like Postman, Insomnia, or Thunder Client.

## Verification

### 1. Check Backend Health

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "api": "running",
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

### 2. Test API Endpoints

```bash
# List requests
curl http://localhost:3001/api/requests

# List hosts
curl http://localhost:3001/api/hosts

# Get qualification stats
curl http://localhost:3001/api/qualification/stats
```

### 3. Access Frontend

Open http://localhost:3000 in your browser. You should see the Copilot Dashboard.

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongo --eval "db.version()"

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/agenda-manager
```

### Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3001  # Backend
lsof -i :3000  # Frontend

# Kill the process or change the port in .env
PORT=3002
```

### OpenAI API Errors

If you don't have an OpenAI API key:
- The system will use rule-based qualification instead
- All features will work, but GenAI capabilities will be limited

Get a key at: https://platform.openai.com/api-keys

### Dependencies Installation Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Edit files in `backend/src/` or `frontend/` directories.

### 3. Test Your Changes

```bash
# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend
```

### 4. Commit and Push

```bash
git add .
git commit -m "Add: your feature description"
git push origin feature/your-feature-name
```

## Building for Production

```bash
# Build all workspaces
npm run build

# Build individually
npm run build:frontend
npm run build:backend

# Start production server
npm start
```

## Next Steps

1. **Explore the API**: Check out the [API Documentation](./docs/API.md)
2. **Run the Scheduler**: Test the optimization algorithms
3. **Customize the UI**: Modify the frontend components
4. **Add Integrations**: Connect Outlook, Salesforce, etc.
5. **Deploy**: Follow the [Deployment Guide](./docs/DEPLOYMENT.md)

## Getting Help

- **Issues**: Check existing issues or create a new one
- **Documentation**: See the `docs/` directory
- **Logs**: Check `backend/logs/` for error logs

## Useful Commands

```bash
# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Restart services
npm run docker:down && npm run docker:up

# Clean build artifacts
npm run clean --workspaces

# Lint code
npm run lint
```

---

**Ready to build?** Start with the [Architecture Overview](./README.md#architecture-overview) to understand the system design.
