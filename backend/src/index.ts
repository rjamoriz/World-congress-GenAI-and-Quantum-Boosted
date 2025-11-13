/**
 * Main entry point for the Agenda Manager backend server
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { initializeTelemetry } from './config/telemetry';
import { validateAndLoadEnv } from './config/env';

// Routes
import requestRoutes from './routes/requests';
import hostRoutes from './routes/hosts';
import scheduleRoutes from './routes/schedule';
import qualificationRoutes from './routes/qualification';
import workflowRoutes from './routes/workflow';
import healthRoutes from './routes/health';
import voiceRoutes from './routes/voice';
import assistantRoutes from './routes/assistant';
import quantumRoutes from './routes/quantum';
import dwaveRoutes from './routes/dwave';
import metricsRoutes from './routes/metrics';
import { metricsMiddleware } from './middleware/metrics';
import { RealtimeVoiceService } from './services/voice/RealtimeVoiceService';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
// Support multiple allowed origins via FRONTEND_URLS (comma-separated) or fallback to FRONTEND_URL
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// WebSocket server for OpenAI Realtime API proxy
const wss = new WebSocketServer({ 
  noServer: true,
  path: '/api/voice/realtime-ws'
});
const realtimeVoiceService = new RealtimeVoiceService();

// Middleware
app.use(helmet());
// CORS: allow configured origins and handle null origins (e.g., curl, mobile apps)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Metrics middleware (before routes)
app.use(metricsMiddleware);

// Rate limiting for all API routes
app.use('/api', rateLimiter);

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api/requests', requestRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/qualification', qualificationRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/quantum', quantumRoutes);
app.use('/api/dwave', dwaveRoutes);
app.use('/api/outlook', require('./routes/outlook').default);
app.use('/metrics', metricsRoutes);
app.get('/', (req, res) => {
  res.json({
    name: 'Agenda Manager API',
    version: '0.1.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
  
  socket.on('subscribe', (room: string) => {
    socket.join(room);
    logger.info(`Client ${socket.id} subscribed to room: ${room}`);
  });
  
  socket.on('unsubscribe', (room: string) => {
    socket.leave(room);
    logger.info(`Client ${socket.id} unsubscribed from room: ${room}`);
  });
});

// Handle WebSocket upgrade for Realtime API
httpServer.on('upgrade', (request: any, socket: any, head: any) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  
  // Handle Realtime API WebSocket connections
  if (url.pathname === '/api/voice/realtime-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      const sessionId = uuidv4();
      const query = Object.fromEntries(url.searchParams);
      
      const config = {
        model: query.model as string || 'gpt-4o-realtime-preview-2024-12-17',
        voice: (query.voice as any) || 'alloy',
        modalities: query.modalities ? query.modalities.split(',') as any : ['text', 'audio'],
        temperature: query.temperature ? parseFloat(query.temperature) : 0.7
      };

      logger.info('Realtime WebSocket upgrade', { sessionId, config });
      
      // Create Realtime session
      realtimeVoiceService.createRealtimeSession(ws, config, sessionId);
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    console.log('Starting server initialization...');
    
    // Validate environment configuration first (fail-fast)
    console.log('Validating environment configuration...');
    validateAndLoadEnv();
    console.log('Environment configuration validated!');
    
    // Connect to databases
    console.log('Connecting to MongoDB...');
    await connectDatabase();
    console.log('MongoDB connected!');
    
    console.log('Connecting to Redis...');
    await connectRedis();
    console.log('Redis connected!');
    
    // Initialize Phoenix observability (non-breaking)
    console.log('Initializing Phoenix observability...');
    const phoenixInitialized = initializeTelemetry();
    if (phoenixInitialized) {
      console.log('Phoenix observability initialized!');
    } else {
      console.log('Phoenix observability disabled or failed to initialize');
    }
    
    // Start HTTP server
    console.log(`Starting HTTP server on port ${PORT}...`);
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📡 WebSocket server ready`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`✅ Server is ready at http://localhost:${PORT}`);
        resolve();
      });
      
      httpServer.on('error', (error) => {
        logger.error('Server error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

console.log('Initializing application...');

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Add timeout to prevent hanging
const startupTimeout = setTimeout(() => {
  console.error('❌ Server startup timeout after 30 seconds');
  process.exit(1);
}, 30000);

startServer().then(() => {
  clearTimeout(startupTimeout);
  console.log('✅ Server startup completed successfully');
  // Don't exit - keep server running
}).catch(err => {
  clearTimeout(startupTimeout);
  console.error('Startup error:', err);
  process.exit(1);
});

export { app, io };
