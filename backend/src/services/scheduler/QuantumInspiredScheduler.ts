/**
 * Quantum-Inspired Scheduler using simulated annealing
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

interface Solution {
  assignments: Map<string, { hostId: string; slotIndex: number }>;
  score: number;
}

export class QuantumInspiredScheduler {
  private temperature = 1000;
  private coolingRate = 0.95;
  private minTemperature = 1;
  private maxIterations = 1000;
  
  async schedule(request: SchedulerRequest): Promise<SchedulerResult> {
    logger.info('Running quantum-inspired scheduler (simulated annealing)');
    
    const hostSlots = this.buildHostSlots(request.hosts);
    let currentSolution = this.generateInitialSolution(request.requests, hostSlots);
    let bestSolution = { ...currentSolution };
    
    let temperature = this.temperature;
    let iterations = 0;
    
    while (temperature > this.minTemperature && iterations < this.maxIterations) {
      const neighborSolution = this.generateNeighbor(currentSolution, request.requests, hostSlots);
      const delta = neighborSolution.score - currentSolution.score;
      
      if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
        currentSolution = neighborSolution;
        if (currentSolution.score > bestSolution.score) {
          bestSolution = { ...currentSolution };
        }
      }
      
      temperature *= this.coolingRate;
      iterations++;
    }
    
    logger.info(`Simulated annealing: ${iterations} iterations, score: ${bestSolution.score}`);
    
    return this.solutionToResult(bestSolution, request, hostSlots);
  }
  
  private buildHostSlots(hosts: Host[]): Map<string, TimeSlot[]> {
    const hostSlots = new Map<string, TimeSlot[]>();
    hosts.forEach(host => {
      const slots: TimeSlot[] = [];
      host.availability.forEach(availability => {
        if (!availability.isBlocked) {
          availability.timeSlots.forEach(slot => {
            slots.push({ ...slot, hostId: host.id });
          });
        }
      });
      hostSlots.set(host.id, slots);
    });
    return hostSlots;
  }
  
  private generateInitialSolution(requests: MeetingRequest[], hostSlots: Map<string, TimeSlot[]>): Solution {
    const assignments = new Map<string, { hostId: string; slotIndex: number }>();
    requests.forEach(request => {
      const allHosts = Array.from(hostSlots.keys());
      if (allHosts.length === 0) return;
      const randomHostId = allHosts[Math.floor(Math.random() * allHosts.length)];
      const hostSlotsArray = hostSlots.get(randomHostId)!;
      if (hostSlotsArray.length > 0) {
        const randomSlotIndex = Math.floor(Math.random() * hostSlotsArray.length);
        assignments.set(request.id, { hostId: randomHostId, slotIndex: randomSlotIndex });
      }
    });
    const score = this.evaluateSolution(assignments, requests, hostSlots);
    return { assignments, score };
  }
  
  private generateNeighbor(solution: Solution, requests: MeetingRequest[], hostSlots: Map<string, TimeSlot[]>): Solution {
    const newAssignments = new Map(solution.assignments);
    const randomRequest = requests[Math.floor(Math.random() * requests.length)];
    const allHosts = Array.from(hostSlots.keys());
    if (allHosts.length > 0) {
      const randomHostId = allHosts[Math.floor(Math.random() * allHosts.length)];
      const hostSlotsArray = hostSlots.get(randomHostId)!;
      if (hostSlotsArray.length > 0) {
        const randomSlotIndex = Math.floor(Math.random() * hostSlotsArray.length);
        newAssignments.set(randomRequest.id, { hostId: randomHostId, slotIndex: randomSlotIndex });
      }
    }
    const score = this.evaluateSolution(newAssignments, requests, hostSlots);
    return { assignments: newAssignments, score };
  }
  
  private evaluateSolution(assignments: Map<string, { hostId: string; slotIndex: number }>, requests: MeetingRequest[], hostSlots: Map<string, TimeSlot[]>): number {
    let score = 0;
    const usedSlots = new Set<string>();
    requests.forEach(request => {
      const assignment = assignments.get(request.id);
      if (!assignment) return;
      const hostSlotsArray = hostSlots.get(assignment.hostId);
      if (!hostSlotsArray || assignment.slotIndex >= hostSlotsArray.length) return;
      const slot = hostSlotsArray[assignment.slotIndex];
      const slotKey = `${assignment.hostId}:${slot.date}:${slot.startTime}`;
      if (usedSlots.has(slotKey)) {
        score -= 100;
      } else {
        usedSlots.add(slotKey);
        score += request.importanceScore || 50;
        if (request.preferredDates?.includes(slot.date)) score += 15;
      }
    });
    return score;
  }
  
  private solutionToResult(solution: Solution, request: SchedulerRequest, hostSlots: Map<string, TimeSlot[]>): SchedulerResult {
    const assignments: MeetingAssignment[] = [];
    const unscheduled: UnscheduledRequest[] = [];
    request.requests.forEach(req => {
      const assignment = solution.assignments.get(req.id);
      if (!assignment) {
        unscheduled.push({ requestId: req.id, reason: 'No suitable slot found' });
        return;
      }
      const hostSlotsArray = hostSlots.get(assignment.hostId);
      if (hostSlotsArray && assignment.slotIndex < hostSlotsArray.length) {
        const slot = hostSlotsArray[assignment.slotIndex];
        assignments.push({
          requestId: req.id,
          hostId: assignment.hostId,
          timeSlot: slot,
          score: req.importanceScore || 50,
          explanation: `Quantum-inspired assignment (score: ${req.importanceScore})`
        });
      } else {
        unscheduled.push({ requestId: req.id, reason: 'Invalid slot assignment' });
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
      explanation: 'Simulated annealing optimization'
    };
  }
}
