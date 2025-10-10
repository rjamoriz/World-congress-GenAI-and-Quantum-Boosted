/**
 * Arize Phoenix Configuration
 * Centralized configuration for LLM observability
 */

import { logger } from '../utils/logger';

export interface PhoenixConfig {
  enabled: boolean;
  endpoint: string;
  projectName: string;
  serviceName: string;
  environment: string;
  tracing: {
    enabled: boolean;
    sampleRate: number;
  };
  metrics: {
    enabled: boolean;
    collectInterval: number;
  };
  dashboard: {
    enabled: boolean;
    port: number;
  };
}

export const phoenixConfig: PhoenixConfig = {
  enabled: process.env.PHOENIX_ENABLED === 'true',
  endpoint: process.env.PHOENIX_ENDPOINT || 'http://localhost:6006',
  projectName: process.env.PHOENIX_PROJECT_NAME || 'world-congress-agenda-manager',
  serviceName: process.env.OTEL_SERVICE_NAME || 'agenda-manager-backend',
  environment: process.env.NODE_ENV || 'development',
  
  tracing: {
    enabled: process.env.PHOENIX_TRACING !== 'false', // Default true if Phoenix enabled
    sampleRate: parseFloat(process.env.PHOENIX_SAMPLE_RATE || '1.0'),
  },
  
  metrics: {
    enabled: process.env.PHOENIX_METRICS !== 'false', // Default true if Phoenix enabled
    collectInterval: parseInt(process.env.PHOENIX_METRICS_INTERVAL || '30000'), // 30 seconds
  },
  
  dashboard: {
    enabled: process.env.PHOENIX_DASHBOARD !== 'false', // Default true if Phoenix enabled
    port: parseInt(process.env.PHOENIX_PORT || '6006'),
  }
};

/**
 * Validate Phoenix configuration
 */
export function validatePhoenixConfig(): boolean {
  if (!phoenixConfig.enabled) {
    logger.info('Phoenix observability is disabled');
    return true;
  }

  try {
    // Validate endpoint URL
    new URL(phoenixConfig.endpoint);
    
    // Validate sample rate
    if (phoenixConfig.tracing.sampleRate < 0 || phoenixConfig.tracing.sampleRate > 1) {
      throw new Error('Phoenix sample rate must be between 0 and 1');
    }
    
    // Validate metrics interval
    if (phoenixConfig.metrics.collectInterval < 1000) {
      throw new Error('Phoenix metrics interval must be at least 1000ms');
    }
    
    logger.info('Phoenix configuration validated successfully', {
      endpoint: phoenixConfig.endpoint,
      projectName: phoenixConfig.projectName,
      environment: phoenixConfig.environment,
      tracing: phoenixConfig.tracing.enabled,
      metrics: phoenixConfig.metrics.enabled
    });
    
    return true;
  } catch (error) {
    logger.error('Phoenix configuration validation failed:', error);
    return false;
  }
}

/**
 * Get environment-specific Phoenix configuration
 */
export function getPhoenixConfigForEnvironment(env: string): Partial<PhoenixConfig> {
  const configs = {
    development: {
      enabled: true,
      endpoint: 'http://localhost:6006',
      tracing: { enabled: true, sampleRate: 1.0 }, // Trace everything in dev
      metrics: { enabled: true, collectInterval: 10000 }, // More frequent metrics in dev
    },
    
    staging: {
      enabled: true,
      endpoint: process.env.PHOENIX_ENDPOINT || 'http://phoenix-staging:6006',
      tracing: { enabled: true, sampleRate: 0.5 }, // Sample 50% in staging
      metrics: { enabled: true, collectInterval: 30000 },
    },
    
    production: {
      enabled: process.env.PHOENIX_ENABLED === 'true', // Explicit opt-in for production
      endpoint: process.env.PHOENIX_ENDPOINT || 'http://phoenix-prod:6006',
      tracing: { enabled: true, sampleRate: 0.1 }, // Sample 10% in production
      metrics: { enabled: true, collectInterval: 60000 }, // Less frequent metrics in prod
    }
  };
  
  return configs[env as keyof typeof configs] || configs.development;
}

/**
 * Check if Phoenix is available
 */
export async function checkPhoenixHealth(): Promise<boolean> {
  if (!phoenixConfig.enabled) {
    return true; // Consider healthy if disabled
  }
  
  try {
    const response = await fetch(`${phoenixConfig.endpoint}/health`, {
      method: 'GET',
    });
    
    const isHealthy = response.ok;
    logger.info(`Phoenix health check: ${isHealthy ? 'healthy' : 'unhealthy'}`, {
      endpoint: phoenixConfig.endpoint,
      status: response.status
    });
    
    return isHealthy;
  } catch (error) {
    logger.warn('Phoenix health check failed:', error);
    return false;
  }
}

/**
 * Initialize Phoenix with graceful fallback
 */
export async function initializePhoenix(): Promise<boolean> {
  if (!phoenixConfig.enabled) {
    logger.info('Phoenix initialization skipped (disabled)');
    return true;
  }
  
  try {
    // Validate configuration
    if (!validatePhoenixConfig()) {
      logger.warn('Phoenix configuration invalid, disabling observability');
      return false;
    }
    
    // Check Phoenix server availability
    const isHealthy = await checkPhoenixHealth();
    if (!isHealthy) {
      logger.warn('Phoenix server not available, continuing without observability');
      return false;
    }
    
    logger.info('Phoenix initialized successfully', {
      projectName: phoenixConfig.projectName,
      serviceName: phoenixConfig.serviceName,
      endpoint: phoenixConfig.endpoint
    });
    
    return true;
  } catch (error) {
    logger.error('Phoenix initialization failed:', error);
    logger.warn('Continuing without Phoenix observability');
    return false;
  }
}
