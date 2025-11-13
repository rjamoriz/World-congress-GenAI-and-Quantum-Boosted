/**
 * Environment Configuration with Zod Validation
 * Validates all environment variables on startup and provides type-safe config
 */

import { z } from 'zod';
import { logger } from '../utils/logger';

// Zod schema for environment variables
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  FRONTEND_URL: z.string().url().optional(),
  FRONTEND_URLS: z.string().optional(), // Comma-separated URLs
  
  // Database - MongoDB is required
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  MONGODB_TEST_URI: z.string().optional(),
  
  // Redis - required for caching
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // JWT - required for authentication
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  
  // OpenAI - optional but recommended
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // D-Wave Quantum (optional)
  DWAVE_API_TOKEN: z.string().optional(),
  DWAVE_SOLVER: z.string().default('Advantage_system4.1'),
  ENABLE_QUANTUM: z.string().transform(v => v === 'true').default('false'),
  
  // Microsoft Outlook Integration (optional)
  OUTLOOK_CLIENT_ID: z.string().optional(),
  OUTLOOK_CLIENT_SECRET: z.string().optional(),
  OUTLOOK_TENANT_ID: z.string().optional(),
  OUTLOOK_REDIRECT_URI: z.string().optional(),
  
  // Salesforce Integration (optional)
  SALESFORCE_CLIENT_ID: z.string().optional(),
  SALESFORCE_CLIENT_SECRET: z.string().optional(),
  SALESFORCE_INSTANCE_URL: z.string().optional(),
  SALESFORCE_API_VERSION: z.string().default('v58.0'),
  
  // Email Service (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // File Storage
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Logging & Monitoring
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_TRACING: z.string().transform(v => v === 'true').default('true'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  
  // Feature Flags
  ENABLE_WEBSOCKETS: z.string().transform(v => v === 'true').default('true'),
  ENABLE_REAL_TIME_UPDATES: z.string().transform(v => v === 'true').default('true'),
  ENABLE_AUDIT_LOGGING: z.string().transform(v => v === 'true').default('true'),
  ENABLE_SYNTHETIC_DATA: z.string().transform(v => v === 'true').default('true'),
  
  // Scheduler Configuration
  SCHEDULER_ALGORITHM: z.enum(['classical', 'quantum', 'hybrid']).default('hybrid'),
  CLASSICAL_SOLVER_TIMEOUT: z.string().transform(Number).default('30000'),
  QUANTUM_SOLVER_TIMEOUT: z.string().transform(Number).default('60000'),
  MAX_MEETINGS_PER_DAY: z.string().transform(Number).default('8'),
  MEETING_DURATION_MINUTES: z.string().transform(Number).default('30'),
  WORKING_HOURS_START: z.string().default('09:00'),
  WORKING_HOURS_END: z.string().default('18:00'),
  
  // Development
  DEBUG: z.string().optional(),
  MOCK_EXTERNAL_APIS: z.string().transform(v => v === 'true').default('false'),
});

// Infer TypeScript type from schema
export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig | null = null;

/**
 * Validate and load environment configuration
 * Call this once at application startup
 */
export function validateAndLoadEnv(): EnvConfig {
  if (config) {
    return config;
  }

  try {
    // Parse and validate environment variables
    config = envSchema.parse(process.env);
    
    logger.info('✅ Environment configuration validated successfully');
    
    // Log important config (excluding sensitive values)
    logger.info('Configuration:', {
      nodeEnv: config.NODE_ENV,
      port: config.PORT,
      mongoUri: config.MONGODB_URI ? '***configured***' : 'missing',
      redisUrl: config.REDIS_URL ? '***configured***' : 'missing',
      openaiKey: config.OPENAI_API_KEY ? '***configured***' : 'not set',
      quantumEnabled: config.ENABLE_QUANTUM,
      schedulerAlgorithm: config.SCHEDULER_ALGORITHM
    });
    
    return config;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment configuration. Please check your .env file.');
    }
    throw error;
  }
}

/**
 * Get validated environment configuration
 * Must call validateAndLoadEnv() first during startup
 */
export function getEnv(): EnvConfig {
  if (!config) {
    throw new Error('Environment not loaded. Call validateAndLoadEnv() first.');
  }
  return config;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof Pick<EnvConfig, 
  'ENABLE_WEBSOCKETS' | 
  'ENABLE_REAL_TIME_UPDATES' | 
  'ENABLE_AUDIT_LOGGING' | 
  'ENABLE_SYNTHETIC_DATA' |
  'ENABLE_QUANTUM' |
  'ENABLE_TRACING' |
  'MOCK_EXTERNAL_APIS'
>): boolean {
  const env = getEnv();
  return env[feature] === true;
}
