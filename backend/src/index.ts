/**
 * Main entry point for the Agenda Manager backend server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Routes
import requestRoutes from './routes/requests';
import hostRoutes from './routes/hosts';
import scheduleRoutes from './routes/schedule';
import qualificationRoutes from './routes/qualification';
import workflowRoutes from './routes/workflow';
import healthRoutes from './routes/health';
import voiceRoutes from './routes/voice';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', rateLimiter);

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/qualification', qualificationRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/voice', voiceRoutes);

// Root endpoint
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
    
    // Connect to databases
    console.log('Connecting to MongoDB...');
    await connectDatabase();
    console.log('MongoDB connected!');
    
    console.log('Connecting to Redis...');
    await connectRedis();
    console.log('Redis connected!');
    
    // Start HTTP server
    console.log(`Starting HTTP server on port ${PORT}...`);
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 WebSocket server ready`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Server is ready at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

console.log('Initializing application...');

// Add timeout to prevent hanging
const startupTimeout = setTimeout(() => {
  console.error('❌ Server startup timeout after 30 seconds');
  process.exit(1);
}, 30000);

startServer().then(() => {
  clearTimeout(startupTimeout);
  console.log('✅ Server startup completed successfully');
}).catch(err => {
  clearTimeout(startupTimeout);
  console.error('Startup error:', err);
  process.exit(1);
});

export { app, io };
