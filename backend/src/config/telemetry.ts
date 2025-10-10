/**
 * Simplified Phoenix Integration
 * Manual instrumentation to avoid OpenTelemetry version conflicts
 */

import { phoenixConfig, validatePhoenixConfig } from './phoenix';
import { logger } from '../utils/logger';

let isInitialized = false;

/**
 * Initialize Phoenix integration (simplified)
 */
export function initializeTelemetry(): boolean {
  // Skip if Phoenix is disabled
  if (!phoenixConfig.enabled) {
    logger.info('Phoenix telemetry disabled');
    return true;
  }

  // Validate configuration
  if (!validatePhoenixConfig()) {
    logger.warn('Phoenix configuration invalid, skipping telemetry initialization');
    return false;
  }

  try {
    // For now, we'll use manual HTTP-based tracing to Phoenix
    // This avoids OpenTelemetry version conflicts
    isInitialized = true;

    logger.info('Phoenix telemetry initialized successfully (manual mode)', {
      endpoint: phoenixConfig.endpoint,
      serviceName: phoenixConfig.serviceName,
      projectName: phoenixConfig.projectName,
      environment: phoenixConfig.environment
    });

    return true;

  } catch (error) {
    logger.error('Failed to initialize Phoenix telemetry:', error);
    return false;
  }
}

/**
 * Send trace data to Phoenix manually
 */
export async function sendTraceToPhoenix(traceData: any): Promise<void> {
  if (!isInitialized || !phoenixConfig.enabled) {
    return;
  }

  try {
    const response = await fetch(`${phoenixConfig.endpoint}/v1/traces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(traceData),
    });

    if (!response.ok) {
      logger.debug('Failed to send trace to Phoenix:', response.statusText);
    }
  } catch (error) {
    logger.debug('Error sending trace to Phoenix:', error);
  }
}

/**
 * Check if telemetry is initialized
 */
export function isTelemetryInitialized(): boolean {
  return isInitialized && phoenixConfig.enabled;
}

/**
 * Shutdown telemetry gracefully
 */
export async function shutdownTelemetry(): Promise<void> {
  if (isInitialized) {
    try {
      isInitialized = false;
      logger.info('Phoenix telemetry shutdown completed');
    } catch (error) {
      logger.error('Error during telemetry shutdown:', error);
    }
  }
}
