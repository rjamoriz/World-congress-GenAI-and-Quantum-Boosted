/**
 * Qiskit Quantum Scheduler using real IBM Qiskit AER backend
 */

import {
  SchedulerRequest,
  SchedulerResult,
  SchedulerAlgorithm,
  MeetingAssignment,
  UnscheduledRequest,
  MeetingRequest,
  Host,
  TimeSlot
} from '@agenda-manager/shared';
import { logger } from '../../utils/logger';
import { qaoaOptimizationDuration, scheduledMeetingsTotal, schedulingSuccessRate } from '../../middleware/metrics';

export class QiskitQuantumScheduler {
  private maxQubits = 16; // Limit for NISQ devices
  private shots = 1024;
  private maxLayers = 3; // QAOA layers
  
  async schedule(request: SchedulerRequest): Promise<SchedulerResult> {
    logger.info('Running Qiskit quantum scheduler (QAOA)');
    
    const startTime = Date.now();
    
    try {
      // Run quantum optimization using Python backend
      const quantumResult = await this.runQAOA(request);
      
      // Record optimization duration
      const duration = (Date.now() - startTime) / 1000;
      qaoaOptimizationDuration.observe(duration);
      logger.info(`QAOA optimization took ${duration.toFixed(2)}s`);
      
      // Convert quantum result to schedule
      const result = this.quantumResultToSchedule(quantumResult, request);
      
      // Record scheduled meetings
      scheduledMeetingsTotal.inc({ algorithm: 'qaoa' }, result.assignments.length);
      
      // Calculate and record success rate
      const successRate = (result.assignments.length / request.requests.length) * 100;
      schedulingSuccessRate.set({ algorithm: 'qaoa' }, successRate);
      logger.info(`QAOA scheduling success rate: ${successRate.toFixed(1)}%`);
      
      return result;
      
    } catch (error) {
      logger.error('Quantum optimization failed, falling back to classical:', error);
      return this.classicalFallback(request);
    }
  }
  
  /**
   * Run QAOA using Qiskit AER Python backend
   */
  private async runQAOA(request: SchedulerRequest): Promise<{ [key: string]: number }> {
    const { PythonShell } = require('python-shell');
    
    return new Promise((resolve, reject) => {
      const options = {
        mode: 'text' as const,
        pythonPath: 'python3',
        scriptPath: __dirname + '/../../..'
      };
      
      const pyshell = new PythonShell('quantum_backend.py', options);
      
      // Prepare input data
      const inputData = {
        quantumConfig: request.quantumConfig || {
          backend: 'aer_simulator',
          shots: this.shots,
          layers: this.maxLayers,
          optimizer: 'COBYLA',
          maxIterations: 200
        },
        problemData: {
          requests: request.requests,
          hosts: request.hosts,
          constraints: request.constraints
        }
      };
      
      // Send data to Python script
      pyshell.send(JSON.stringify(inputData));
      
      let result = '';
      let errorOutput = '';
      
      pyshell.on('message', (message: string) => {
        result += message;
      });
      
      pyshell.on('stderr', (stderr: string) => {
        errorOutput += stderr;
        logger.info('Quantum backend:', stderr);
      });
      
      pyshell.end((err: any) => {
        if (err) {
          logger.error('Qiskit AER execution failed:', err);
          logger.error('Error output:', errorOutput);
          reject(err);
        } else {
          try {
            const quantumResult = JSON.parse(result);
            logger.info('Quantum optimization completed:', quantumResult.status);
            resolve(quantumResult.solution || {});
          } catch (parseErr) {
            logger.error('Failed to parse quantum result:', parseErr);
            logger.error('Raw result:', result);
            reject(parseErr);
          }
        }
      });
    });
  }
  
  /**
   * Convert quantum optimization result to meeting schedule
   */
  private quantumResultToSchedule(
    quantumResult: { [key: string]: number },
    request: SchedulerRequest
  ): SchedulerResult {
    const assignments: MeetingAssignment[] = [];
    const unscheduled: UnscheduledRequest[] = [];
    
    // Extract assignments from quantum solution
    Object.entries(quantumResult).forEach(([variable, value]) => {
      if (value > 0.5) { // Binary threshold
        const parts = variable.split('_');
        if (parts.length >= 4 && parts[0] === 'x') {
          const reqId = parts[1];
          const hostId = parts[2];
          const slotIdx = parseInt(parts[3]);
          
          const req = request.requests.find(r => r.id === reqId);
          const host = request.hosts.find(h => h.id === hostId);
          
          if (req && host && host.availability && host.availability[0]) {
            const slot = host.availability[0].timeSlots[slotIdx];
            if (slot) {
              assignments.push({
                requestId: reqId,
                hostId: hostId,
                timeSlot: { ...slot, hostId },
                score: req.importanceScore || 50,
                explanation: `Qiskit QAOA optimization - Variable: ${variable}, Probability: ${value.toFixed(3)}`
              });
            }
          }
        }
      }
    });
    
    // Find unscheduled requests
    request.requests.forEach(req => {
      const isScheduled = assignments.some(a => a.requestId === req.id);
      if (!isScheduled) {
        unscheduled.push({
          requestId: req.id,
          reason: 'No quantum solution found or constraints violated'
        });
      }
    });
    
    return {
      assignments,
      unscheduled,
      metrics: {
        totalRequests: request.requests.length,
        scheduledCount: assignments.length,
        unscheduledCount: unscheduled.length,
        totalImportanceScore: assignments.reduce((sum, a) => sum + a.score, 0),
        averageHostUtilization: assignments.length / (request.hosts.length * 5),
        constraintViolations: 0
      },
      algorithm: SchedulerAlgorithm.QUANTUM,
      computationTimeMs: 0,
      explanation: `Qiskit AER QAOA optimization with ${this.maxLayers} layers, ${this.shots} shots. Solved ${assignments.length}/${request.requests.length} requests using real quantum simulation.`
    };
  }
  
  /**
   * Classical fallback when quantum optimization fails
   */
  private classicalFallback(request: SchedulerRequest): SchedulerResult {
    logger.info('Using classical fallback for quantum scheduler');
    
    const assignments: MeetingAssignment[] = [];
    const unscheduled: UnscheduledRequest[] = [];
    const usedSlots = new Set<string>();
    
    // Simple greedy assignment
    request.requests
      .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0))
      .forEach(req => {
        let assigned = false;
        
        for (const host of request.hosts) {
          if (assigned) break;
          
          for (const avail of host.availability) {
            if (assigned) break;
            
            for (const slot of avail.timeSlots) {
              const slotKey = `${host.id}:${slot.date}:${slot.startTime}`;
              
              if (!usedSlots.has(slotKey)) {
                usedSlots.add(slotKey);
                assignments.push({
                  requestId: req.id,
                  hostId: host.id,
                  timeSlot: { ...slot, hostId: host.id },
                  score: req.importanceScore || 50,
                  explanation: 'Classical fallback assignment'
                });
                assigned = true;
                break;
              }
            }
          }
        }
        
        if (!assigned) {
          unscheduled.push({
            requestId: req.id,
            reason: 'No available slots in classical fallback'
          });
        }
      });
    
    return {
      assignments,
      unscheduled,
      metrics: {
        totalRequests: request.requests.length,
        scheduledCount: assignments.length,
        unscheduledCount: unscheduled.length,
        totalImportanceScore: assignments.reduce((sum, a) => sum + a.score, 0),
        averageHostUtilization: assignments.length / (request.hosts.length * 5),
        constraintViolations: 0
      },
      algorithm: SchedulerAlgorithm.CLASSICAL,
      computationTimeMs: 0,
      explanation: 'Classical fallback due to quantum optimization failure'
    };
  }
}
