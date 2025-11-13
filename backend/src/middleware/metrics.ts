/**
 * Prometheus Metrics Middleware
 * Tracks application performance and business metrics
 */

import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom Metrics

// HTTP Request Duration
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// HTTP Request Counter
export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Active Requests Gauge
export const activeRequests = new client.Gauge({
  name: 'http_requests_active',
  help: 'Number of active HTTP requests',
  registers: [register]
});

// Business Metrics

// Meeting Requests
export const meetingRequestsTotal = new client.Counter({
  name: 'meeting_requests_total',
  help: 'Total number of meeting requests created',
  labelNames: ['status'],
  registers: [register]
});

// Scheduled Meetings
export const scheduledMeetingsTotal = new client.Counter({
  name: 'scheduled_meetings_total',
  help: 'Total number of successfully scheduled meetings',
  labelNames: ['algorithm'],
  registers: [register]
});

// D-Wave Optimization Time
export const dwaveOptimizationDuration = new client.Histogram({
  name: 'dwave_optimization_duration_seconds',
  help: 'Duration of D-Wave optimization in seconds',
  labelNames: ['status'],
  buckets: [1, 5, 10, 30, 60],
  registers: [register]
});

// QAOA Optimization Time
export const qaoaOptimizationDuration = new client.Histogram({
  name: 'qaoa_optimization_duration_seconds',
  help: 'Duration of QAOA optimization in seconds',
  labelNames: ['status'],
  buckets: [1, 5, 10, 30, 60],
  registers: [register]
});

// Scheduling Success Rate
export const schedulingSuccessRate = new client.Gauge({
  name: 'scheduling_success_rate',
  help: 'Current scheduling success rate (0-100)',
  labelNames: ['algorithm'],
  registers: [register]
});

// Host Utilization
export const hostUtilization = new client.Gauge({
  name: 'host_utilization_percent',
  help: 'Percentage of host time slots utilized',
  labelNames: ['host_name'],
  registers: [register]
});

// AI Assistant Interactions
export const aiAssistantInteractions = new client.Counter({
  name: 'ai_assistant_interactions_total',
  help: 'Total number of AI assistant interactions',
  labelNames: ['type'],
  registers: [register]
});

// Database Operations
export const dbOperationDuration = new client.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duration of database operations',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// Cache Hit Rate
export const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register]
});

export const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register]
});

// WebSocket Connections
export const wsConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  activeRequests.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString()
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestCounter.inc(labels);
    activeRequests.dec();
  });

  next();
};
