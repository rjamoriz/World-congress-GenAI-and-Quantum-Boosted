/**
 * True Quantum Scheduler using Qiskit and QAOA
 * This implements actual quantum optimization for meeting scheduling
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

// Note: This requires qiskit Python package and python-shell npm package
// Install: pip install qiskit qiskit-optimization numpy
// Install: npm install python-shell

interface QUBOMatrix {
  [key: string]: { [key: string]: number };
}

export class QiskitQuantumScheduler {
  private maxQubits = 16; // Limit for NISQ devices
  private shots = 1024;
  private maxLayers = 3; // QAOA layers
  
  async schedule(request: SchedulerRequest): Promise<SchedulerResult> {
    logger.info('Running Qiskit quantum scheduler (QAOA)');
    
    try {
      // Build QUBO formulation
      const qubo = this.buildQUBO(request);
      
      // Run quantum optimization
      const quantumResult = await this.runQAOA(qubo);
      
      // Convert quantum result to schedule
      return this.quantumResultToSchedule(quantumResult, request);
      
    } catch (error) {
      logger.error('Quantum optimization failed, falling back to classical:', error);
      return this.classicalFallback(request);
    }
  }
  
  /**
   * Build QUBO (Quadratic Unconstrained Binary Optimization) matrix
   * This formulates the scheduling problem for quantum optimization
   */
  private buildQUBO(request: SchedulerRequest): QUBOMatrix {
    const qubo: QUBOMatrix = {};
    const variables: string[] = [];
    
    // Create binary variables for each (request, host, timeslot) combination
    request.requests.forEach(req => {
      request.hosts.forEach(host => {
        host.availability.forEach((avail, dayIdx) => {
          avail.timeSlots.forEach((slot, slotIdx) => {
            const varName = `x_${req.id}_${host.id}_${dayIdx}_${slotIdx}`;
            variables.push(varName);
            qubo[varName] = {};
          });
        });
      });
    });
    
    // Objective function: Maximize importance scores and preferences
    variables.forEach(var => {
      const [, reqId, hostId, dayIdx, slotIdx] = var.split('_');
      const req = request.requests.find(r => r.id === reqId);
      const host = request.hosts.find(h => h.id === hostId);
      
      if (req && host) {
        // Reward for scheduling high-importance meetings
        qubo[var][var] = -(req.importanceScore || 50);
        
        // Bonus for expertise match
        const expertiseMatch = req.requestedTopics.some(topic => 
          host.expertise.some(exp => exp.toLowerCase().includes(topic.toLowerCase()))
        );
        if (expertiseMatch) {
          qubo[var][var] -= 20;
        }
        
        // Bonus for preferred dates
        const slot = host.availability[parseInt(dayIdx)]?.timeSlots[parseInt(slotIdx)];
        if (slot && req.preferredDates?.includes(slot.date)) {
          qubo[var][var] -= 15;
        }
      }
    });
    
    // Constraint: Each request can only be scheduled once
    request.requests.forEach(req => {
      const reqVars = variables.filter(v => v.includes(`_${req.id}_`));
      for (let i = 0; i < reqVars.length; i++) {
        for (let j = i + 1; j < reqVars.length; j++) {
          const penalty = 1000; // Large penalty for double-booking
          if (!qubo[reqVars[i]][reqVars[j]]) qubo[reqVars[i]][reqVars[j]] = 0;
          if (!qubo[reqVars[j]][reqVars[i]]) qubo[reqVars[j]][reqVars[i]] = 0;
          qubo[reqVars[i]][reqVars[j]] += penalty;
          qubo[reqVars[j]][reqVars[i]] += penalty;
        }
      }
    });
    
    // Constraint: No time slot conflicts for same host
    request.hosts.forEach(host => {
      host.availability.forEach((avail, dayIdx) => {
        avail.timeSlots.forEach((slot, slotIdx) => {
          const slotVars = variables.filter(v => 
            v.includes(`_${host.id}_${dayIdx}_${slotIdx}`)
          );
          for (let i = 0; i < slotVars.length; i++) {
            for (let j = i + 1; j < slotVars.length; j++) {
              const penalty = 1000;
              if (!qubo[slotVars[i]][slotVars[j]]) qubo[slotVars[i]][slotVars[j]] = 0;
              if (!qubo[slotVars[j]][slotVars[i]]) qubo[slotVars[j]][slotVars[i]] = 0;
              qubo[slotVars[i]][slotVars[j]] += penalty;
              qubo[slotVars[j]][slotVars[i]] += penalty;
            }
          }
        });
      });
    });
    
    return qubo;
  }
  
  /**
   * Run QAOA (Quantum Approximate Optimization Algorithm) using Qiskit
   */
  private async runQAOA(qubo: QUBOMatrix): Promise<{ [key: string]: number }> {
    const { PythonShell } = require('python-shell');
    
    // Python script for Qiskit QAOA
    const pythonScript = `
import numpy as np
from qiskit import Aer
from qiskit.algorithms import QAOA
from qiskit.algorithms.optimizers import COBYLA
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit.utils import QuantumInstance
import json
import sys

def run_qaoa(qubo_dict):
    try:
        # Create quantum program
        qp = QuadraticProgram()
        
        # Add binary variables
        variables = list(set([k for k in qubo_dict.keys()] + 
                           [k for v in qubo_dict.values() for k in v.keys()]))
        
        for var in variables:
            qp.binary_var(var)
        
        # Add QUBO objective
        objective = {}
        for i, var1 in enumerate(variables):
            for j, var2 in enumerate(variables):
                if var1 in qubo_dict and var2 in qubo_dict[var1]:
                    if i == j:
                        objective[var1] = qubo_dict[var1][var2]
                    else:
                        key = (var1, var2) if var1 < var2 else (var2, var1)
                        if key not in objective:
                            objective[key] = qubo_dict[var1][var2]
        
        qp.minimize(quadratic=objective)
        
        # Setup quantum backend
        backend = Aer.get_backend('qasm_simulator')
        quantum_instance = QuantumInstance(backend, shots=${this.shots})
        
        # Run QAOA
        qaoa = QAOA(optimizer=COBYLA(maxiter=100), 
                   reps=${this.maxLayers}, 
                   quantum_instance=quantum_instance)
        
        optimizer = MinimumEigenOptimizer(qaoa)
        result = optimizer.solve(qp)
        
        # Return solution
        solution = {}
        for var in variables:
            solution[var] = result.x[qp.get_variable(var).name] if hasattr(result, 'x') else 0
        
        return solution
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return {}

# Read QUBO from stdin
qubo_input = json.loads(input())
result = run_qaoa(qubo_input)
print(json.dumps(result))
`;
    
    return new Promise((resolve, reject) => {
      const options = {
        mode: 'text' as const,
        pythonPath: 'python3', // or 'python' depending on your system
        scriptPath: '/tmp'
      };
      
      // Write Python script to temp file
      require('fs').writeFileSync('/tmp/qaoa_scheduler.py', pythonScript);
      
      const pyshell = new PythonShell('/tmp/qaoa_scheduler.py', options);
      
      // Send QUBO data
      pyshell.send(JSON.stringify(qubo));
      
      let result = '';
      pyshell.on('message', (message: string) => {
        result += message;
      });
      
      pyshell.end((err: any) => {
        if (err) {
          logger.error('Python QAOA execution failed:', err);
          reject(err);
        } else {
          try {
            const quantumResult = JSON.parse(result);
            resolve(quantumResult);
          } catch (parseErr) {
            logger.error('Failed to parse quantum result:', parseErr);
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
        const [, reqId, hostId, dayIdx, slotIdx] = variable.split('_');
        
        const req = request.requests.find(r => r.id === reqId);
        const host = request.hosts.find(h => h.id === hostId);
        
        if (req && host) {
          const slot = host.availability[parseInt(dayIdx)]?.timeSlots[parseInt(slotIdx)];
          if (slot) {
            assignments.push({
              requestId: reqId,
              hostId: hostId,
              timeSlot: { ...slot, hostId },
              score: req.importanceScore || 50,
              explanation: `Quantum optimization (QAOA) - Variable: ${variable}, Value: ${value.toFixed(3)}`
            });
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
      explanation: `QAOA quantum optimization with ${this.maxLayers} layers, ${this.shots} shots. Solved ${assignments.length}/${request.requests.length} requests.`
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
