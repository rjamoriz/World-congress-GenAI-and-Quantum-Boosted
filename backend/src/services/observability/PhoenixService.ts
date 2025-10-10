/**
 * Phoenix Observability Service
 * Non-breaking LLM observability integration (Manual Mode)
 */

import { logger } from '../../utils/logger';
import { phoenixConfig } from '../../config/phoenix';
import { sendTraceToPhoenix } from '../../config/telemetry';

export interface LLMCallMetadata {
  operation: string;
  model?: string;
  provider: 'openai' | 'anthropic' | 'other';
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface LLMCallResult {
  success: boolean;
  duration: number;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  error?: string;
  response?: any;
}

export class PhoenixService {
  private isEnabled: boolean;
  private isInitialized: boolean = false;

  constructor() {
    this.isEnabled = phoenixConfig.enabled && phoenixConfig.tracing.enabled;
    
    if (this.isEnabled) {
      try {
        this.isInitialized = true;
        logger.info('Phoenix service initialized successfully (manual mode)');
      } catch (error) {
        logger.warn('Phoenix service initialization failed:', error);
        this.isEnabled = false;
      }
    } else {
      logger.info('Phoenix service disabled');
    }
  }

  /**
   * Wrap an LLM call with Phoenix tracing (Manual Mode)
   * Non-breaking: if Phoenix fails, the original function still executes
   */
  async wrapLLMCall<T>(
    metadata: LLMCallMetadata,
    fn: () => Promise<T>
  ): Promise<T> {
    // If Phoenix is disabled, execute function normally
    if (!this.isEnabled || !this.isInitialized) {
      return await fn();
    }

    const startTime = Date.now();
    const traceId = this.generateTraceId();

    try {
      // Execute the original function
      const result = await fn();

      // Record success
      const duration = Date.now() - startTime;
      
      // Send trace data to Phoenix
      await this.sendTrace({
        traceId,
        spanId: this.generateSpanId(),
        operation: metadata.operation,
        provider: metadata.provider,
        model: metadata.model || 'unknown',
        userId: metadata.userId || 'anonymous',
        sessionId: metadata.sessionId || 'unknown',
        requestId: metadata.requestId || 'unknown',
        success: true,
        duration,
        timestamp: new Date().toISOString(),
        serviceName: phoenixConfig.serviceName,
        ...metadata.metadata
      });

      // Log success metrics
      this.recordMetrics({
        operation: metadata.operation,
        success: true,
        duration,
        provider: metadata.provider
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Send error trace to Phoenix
      await this.sendTrace({
        traceId,
        spanId: this.generateSpanId(),
        operation: metadata.operation,
        provider: metadata.provider,
        model: metadata.model || 'unknown',
        userId: metadata.userId || 'anonymous',
        sessionId: metadata.sessionId || 'unknown',
        requestId: metadata.requestId || 'unknown',
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        serviceName: phoenixConfig.serviceName,
        ...metadata.metadata
      });

      // Log error metrics
      this.recordMetrics({
        operation: metadata.operation,
        success: false,
        duration,
        provider: metadata.provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Generate a unique trace ID
   */
  private generateTraceId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Generate a unique span ID
   */
  private generateSpanId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Send trace data to Phoenix
   */
  private async sendTrace(traceData: any): Promise<void> {
    try {
      await sendTraceToPhoenix(traceData);
    } catch (error) {
      // Silently fail to avoid breaking the main flow
      logger.debug('Failed to send trace to Phoenix:', error);
    }
  }

  /**
   * Record custom metrics for LLM calls
   */
  private recordMetrics(result: {
    operation: string;
    success: boolean;
    duration: number;
    provider: string;
    error?: string;
    tokensUsed?: { prompt: number; completion: number; total: number };
    cost?: number;
  }) {
    try {
      // Log structured metrics for Phoenix to collect
      logger.info('LLM call metrics', {
        phoenix_metric: true,
        operation: result.operation,
        provider: result.provider,
        success: result.success,
        duration_ms: result.duration,
        error: result.error,
        tokens_used: result.tokensUsed,
        estimated_cost_usd: result.cost,
        timestamp: new Date().toISOString(),
        service: phoenixConfig.serviceName,
        environment: phoenixConfig.environment
      });
    } catch (error) {
      // Silently fail metrics recording to avoid breaking the main flow
      logger.debug('Failed to record Phoenix metrics:', error);
    }
  }

  /**
   * Record custom event (Manual Mode)
   */
  recordEvent(name: string, attributes?: Record<string, any>) {
    if (!this.isEnabled || !this.isInitialized) {
      return;
    }

    try {
      // Log event for Phoenix to collect
      logger.info('Phoenix event', {
        phoenix_event: true,
        event_name: name,
        timestamp: new Date().toISOString(),
        service: phoenixConfig.serviceName,
        ...attributes
      });
    } catch (error) {
      logger.debug('Failed to record Phoenix event:', error);
    }
  }

  /**
   * Get current trace context for correlation (Manual Mode)
   */
  getTraceContext(): string | null {
    if (!this.isEnabled || !this.isInitialized) {
      return null;
    }

    // Generate a simple correlation ID
    return this.generateTraceId();
  }

  /**
   * Health check for Phoenix service
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!this.isEnabled) {
      return { healthy: true, message: 'Phoenix disabled' };
    }

    if (!this.isInitialized) {
      return { healthy: false, message: 'Phoenix not initialized' };
    }

    try {
      // Test basic functionality (manual mode)
      await this.sendTrace({
        traceId: this.generateTraceId(),
        spanId: this.generateSpanId(),
        operation: 'health_check',
        provider: 'system',
        success: true,
        duration: 0,
        timestamp: new Date().toISOString(),
        serviceName: phoenixConfig.serviceName
      });

      return { healthy: true, message: 'Phoenix operational (manual mode)' };
    } catch (error) {
      return { 
        healthy: false, 
        message: `Phoenix error: ${error instanceof Error ? error.message : 'Unknown'}` 
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.isEnabled || !this.isInitialized) {
      return;
    }

    try {
      logger.info('Shutting down Phoenix service');
      // Any cleanup logic here
    } catch (error) {
      logger.warn('Error during Phoenix shutdown:', error);
    }
  }
}
