/**
 * Scheduler Service
 * Optimizes meeting assignments using classical and quantum-inspired algorithms
 */

import {
  SchedulerRequest,
  SchedulerResult,
  SchedulerAlgorithm,
  MeetingAssignment,
  UnscheduledRequest,
  SchedulerMetrics,
  MeetingRequest,
  Host,
  TimeSlot
} from '@agenda-manager/shared';
import { logger } from '../../utils/logger';
import { ClassicalScheduler } from './ClassicalScheduler';
import { QuantumInspiredScheduler } from './QuantumInspiredScheduler';

export class SchedulerService {
  private classicalScheduler: ClassicalScheduler;
  private quantumScheduler: QuantumInspiredScheduler;
  
  constructor() {
    this.classicalScheduler = new ClassicalScheduler();
    this.quantumScheduler = new QuantumInspiredScheduler();
  }
  
  async optimize(request: SchedulerRequest): Promise<SchedulerResult> {
    const startTime = Date.now();
    const algorithm = request.algorithm || SchedulerAlgorithm.HYBRID;
    
    logger.info(`Starting optimization with algorithm: ${algorithm}`);
    logger.info(`Requests: ${request.requests.length}, Hosts: ${request.hosts.length}`);
    
    try {
      let result: SchedulerResult;
      
      switch (algorithm) {
        case SchedulerAlgorithm.QUANTUM:
          result = await this.quantumScheduler.schedule(request);
          break;
        case SchedulerAlgorithm.CLASSICAL:
          result = await this.classicalScheduler.schedule(request);
          break;
        case SchedulerAlgorithm.HYBRID:
        default:
          result = await this.hybridSchedule(request);
          break;
      }
      
      result.computationTimeMs = Date.now() - startTime;
      
      logger.info(`Optimization complete: ${result.assignments.length} assigned, ${result.unscheduled.length} unscheduled`);
      
      return result;
    } catch (error) {
      logger.error('Scheduling error:', error);
      
      // Fallback to classical if quantum fails
      const fallbackResult = await this.classicalScheduler.schedule(request);
      fallbackResult.computationTimeMs = Date.now() - startTime;
      fallbackResult.explanation = 'Fallback to classical algorithm due to error';
      
      return fallbackResult;
    }
  }
  
  private async hybridSchedule(request: SchedulerRequest): Promise<SchedulerResult> {
    // Try quantum-inspired first for smaller problem sizes
    if (request.requests.length <= 50 && request.hosts.length <= 10) {
      try {
        const quantumResult = await this.quantumScheduler.schedule(request);
        
        // If quantum gives good results, use it
        if (quantumResult.metrics.scheduledCount / quantumResult.metrics.totalRequests > 0.7) {
          quantumResult.algorithm = SchedulerAlgorithm.HYBRID;
          quantumResult.explanation = 'Hybrid: Quantum-inspired solution accepted';
          return quantumResult;
        }
      } catch (error) {
        logger.warn('Quantum scheduler failed, falling back to classical');
      }
    }
    
    // Use classical for larger problems or if quantum didn't perform well
    const classicalResult = await this.classicalScheduler.schedule(request);
    classicalResult.algorithm = SchedulerAlgorithm.HYBRID;
    classicalResult.explanation = 'Hybrid: Classical solution (problem size or performance)';
    return classicalResult;
  }
}
