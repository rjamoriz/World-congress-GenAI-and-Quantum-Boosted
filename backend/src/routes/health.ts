/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  let redisStatus = 'disconnected';
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    redisStatus = 'connected';
  } catch (error) {
    redisStatus = 'error';
  }
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
      mongodb: mongoStatus,
      redis: redisStatus
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  res.json(health);
}));

router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  
  let isRedisReady = false;
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    isRedisReady = true;
  } catch (error) {
    isRedisReady = false;
  }
  
  const ready = isMongoReady && isRedisReady;
  
  res.status(ready ? 200 : 503).json({
    ready,
    mongodb: isMongoReady,
    redis: isRedisReady
  });
}));

export default router;
