/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';
import { asyncHandler } from '../middleware/errorHandler';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

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

// GET /api/health/deep - Deep health check with external services
router.get('/deep', asyncHandler(async (req: Request, res: Response) => {
  const env = getEnv();
  const checks: any = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {}
  };

  let overallHealthy = true;

  // MongoDB Check
  const mongoStart = Date.now();
  try {
    const mongoStatus = mongoose.connection.readyState;
    const isConnected = mongoStatus === 1;
    
    if (isConnected && mongoose.connection.db) {
      // Test actual query
      await mongoose.connection.db.admin().ping();
    }
    
    checks.services.mongodb = {
      status: isConnected ? 'healthy' : 'unhealthy',
      latency: Date.now() - mongoStart,
      readyState: mongoStatus,
      host: mongoose.connection.host,
      database: mongoose.connection.name
    };
    
    if (!isConnected) overallHealthy = false;
  } catch (error: any) {
    checks.services.mongodb = {
      status: 'error',
      error: error.message,
      latency: Date.now() - mongoStart
    };
    overallHealthy = false;
  }

  // Redis Check
  const redisStart = Date.now();
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    
    checks.services.redis = {
      status: 'healthy',
      latency: Date.now() - redisStart
    };
  } catch (error: any) {
    checks.services.redis = {
      status: 'error',
      error: error.message,
      latency: Date.now() - redisStart
    };
    overallHealthy = false;
  }

  // OpenAI Check (if enabled)
  if (env.OPENAI_API_KEY) {
    const openaiStart = Date.now();
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
      
      checks.services.openai = {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - openaiStart,
        httpStatus: response.status
      };
      
      if (!response.ok) overallHealthy = false;
    } catch (error: any) {
      checks.services.openai = {
        status: 'error',
        error: error.message,
        latency: Date.now() - openaiStart
      };
      // Don't mark overall as unhealthy for optional OpenAI
    }
  }

  // D-Wave Check (if configured)
  if (env.DWAVE_API_TOKEN && env.DWAVE_SOLVER) {
    const dwaveStart = Date.now();
    try {
      const response = await fetch('https://cloud.dwavesys.com/sapi/solvers/remote/', {
        method: 'GET',
        headers: {
          'X-Auth-Token': env.DWAVE_API_TOKEN
        },
        signal: AbortSignal.timeout(5000)
      });
      
      checks.services.dwave = {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - dwaveStart,
        httpStatus: response.status,
        solver: env.DWAVE_SOLVER
      };
      
      // Don't mark overall as unhealthy for optional D-Wave
    } catch (error: any) {
      checks.services.dwave = {
        status: 'error',
        error: error.message,
        latency: Date.now() - dwaveStart
      };
    }
  }

  checks.status = overallHealthy ? 'healthy' : 'unhealthy';
  
  const statusCode = overallHealthy ? 200 : 503;
  res.status(statusCode).json(checks);
}));

export default router;
