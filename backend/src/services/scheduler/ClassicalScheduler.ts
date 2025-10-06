/**
 * Classical Scheduler
 * Greedy algorithm with constraint satisfaction
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

interface ScheduleState {
  assignments: MeetingAssignment[];
  unscheduled: UnscheduledRequest[];
  hostSchedules: Map<string, TimeSlot[]>; // hostId -> assigned slots
}

export class ClassicalScheduler {
  async schedule(request: SchedulerRequest): Promise<SchedulerResult> {
    logger.info('Running classical scheduler');
    
    const state: ScheduleState = {
      assignments: [],
      unscheduled: [],
      hostSchedules: new Map()
    };
    
    // Initialize host schedules
    request.hosts.forEach(host => {
      state.hostSchedules.set(host.id, []);
    });
    
    // Sort requests by importance score (descending)
    const sortedRequests = [...request.requests].sort(
      (a, b) => (b.importanceScore || 0) - (a.importanceScore || 0)
    );
    
    // Greedy assignment
    for (const req of sortedRequests) {
      const assignment = this.findBestAssignment(req, request.hosts, request.constraints, state);
      
      if (assignment) {
        state.assignments.push(assignment);
        const hostSlots = state.hostSchedules.get(assignment.hostId)!;
        hostSlots.push(assignment.timeSlot);
      } else {
        state.unscheduled.push({
          requestId: req.id,
          reason: 'No available time slots match constraints',
          alternativeSuggestions: this.findAlternativeSlots(req, request.hosts, request.constraints)
        });
      }
    }
    
    const metrics = this.calculateMetrics(state, request);
    
    return {
      assignments: state.assignments,
      unscheduled: state.unscheduled,
      metrics,
      algorithm: SchedulerAlgorithm.CLASSICAL,
      computationTimeMs: 0, // Set by caller
      explanation: `Greedy algorithm: Assigned ${state.assignments.length}/${request.requests.length} meetings`
    };
  }
  
  private findBestAssignment(
    request: MeetingRequest,
    hosts: Host[],
    constraints: any,
    state: ScheduleState
  ): MeetingAssignment | null {
    let bestScore = -1;
    let bestAssignment: MeetingAssignment | null = null;
    
    // Try each host
    for (const host of hosts) {
      if (!host.isActive) continue;
      
      // Check if host has relevant expertise
      const expertiseMatch = this.checkExpertiseMatch(request, host);
      
      // Try each availability slot
      for (const availability of host.availability) {
        if (availability.isBlocked) continue;
        
        for (const slot of availability.timeSlots) {
          // Check if slot is available
          const isAvailable = this.isSlotAvailable(host.id, slot, state);
          if (!isAvailable) continue;
          
          // Check constraints
          const meetsConstraints = this.checkConstraints(slot, host, request, constraints, state);
          if (!meetsConstraints) continue;
          
          // Calculate assignment score
          const score = this.calculateAssignmentScore(request, host, slot, expertiseMatch);
          
          if (score > bestScore) {
            bestScore = score;
            bestAssignment = {
              requestId: request.id,
              hostId: host.id,
              timeSlot: slot,
              score,
              explanation: this.generateExplanation(request, host, slot, score, expertiseMatch)
            };
          }
        }
      }
    }
    
    return bestAssignment;
  }
  
  private isSlotAvailable(hostId: string, slot: TimeSlot, state: ScheduleState): boolean {
    const hostSlots = state.hostSchedules.get(hostId);
    if (!hostSlots) return false;
    
    // Check for time conflicts
    return !hostSlots.some(existing => 
      existing.date === slot.date &&
      this.timeSlotsOverlap(existing, slot)
    );
  }
  
  private timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.date !== slot2.date) return false;
    
    const start1 = this.timeToMinutes(slot1.startTime);
    const end1 = this.timeToMinutes(slot1.endTime);
    const start2 = this.timeToMinutes(slot2.startTime);
    const end2 = this.timeToMinutes(slot2.endTime);
    
    return !(end1 <= start2 || end2 <= start1);
  }
  
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  private checkConstraints(
    slot: TimeSlot,
    host: Host,
    request: MeetingRequest,
    constraints: any,
    state: ScheduleState
  ): boolean {
    // Check working hours
    const startMinutes = this.timeToMinutes(slot.startTime);
    const endMinutes = this.timeToMinutes(slot.endTime);
    const workStart = this.timeToMinutes(constraints.workingHoursStart);
    const workEnd = this.timeToMinutes(constraints.workingHoursEnd);
    
    if (startMinutes < workStart || endMinutes > workEnd) {
      return false;
    }
    
    // Check max meetings per day for host
    const hostSlots = state.hostSchedules.get(host.id) || [];
    const meetingsOnDate = hostSlots.filter(s => s.date === slot.date).length;
    
    if (meetingsOnDate >= host.maxMeetingsPerDay) {
      return false;
    }
    
    return true;
  }
  
  private checkExpertiseMatch(request: MeetingRequest, host: Host): boolean {
    // Check if host's preferred meeting types include this type
    if (host.preferredMeetingTypes.includes(request.meetingType)) {
      return true;
    }
    
    // Check expertise alignment (simplified)
    const requestTopicsLower = request.requestedTopics.map(t => t.toLowerCase());
    const hostExpertiseLower = host.expertise.map(e => e.toLowerCase());
    
    return requestTopicsLower.some(topic =>
      hostExpertiseLower.some(exp => topic.includes(exp) || exp.includes(topic))
    );
  }
  
  private calculateAssignmentScore(
    request: MeetingRequest,
    host: Host,
    slot: TimeSlot,
    expertiseMatch: boolean
  ): number {
    let score = request.importanceScore || 50;
    
    // Bonus for expertise match
    if (expertiseMatch) {
      score += 20;
    }
    
    // Bonus for preferred dates
    if (request.preferredDates?.includes(slot.date)) {
      score += 15;
    }
    
    // Bonus for preferred meeting types
    if (host.preferredMeetingTypes.includes(request.meetingType)) {
      score += 10;
    }
    
    return score;
  }
  
  private generateExplanation(
    request: MeetingRequest,
    host: Host,
    slot: TimeSlot,
    score: number,
    expertiseMatch: boolean
  ): string {
    const reasons = [];
    
    reasons.push(`Importance score: ${request.importanceScore || 50}`);
    
    if (expertiseMatch) {
      reasons.push('Host expertise matches request topics');
    }
    
    if (request.preferredDates?.includes(slot.date)) {
      reasons.push('Preferred date available');
    }
    
    if (host.preferredMeetingTypes.includes(request.meetingType)) {
      reasons.push('Host prefers this meeting type');
    }
    
    return `Assigned to ${host.name} (Score: ${Math.round(score)}). ${reasons.join('. ')}.`;
  }
  
  private findAlternativeSlots(
    request: MeetingRequest,
    hosts: Host[],
    constraints: any
  ): TimeSlot[] {
    // Return up to 3 alternative suggestions
    const alternatives: TimeSlot[] = [];
    
    for (const host of hosts) {
      for (const availability of host.availability) {
        if (availability.isBlocked) continue;
        
        for (const slot of availability.timeSlots) {
          if (alternatives.length >= 3) break;
          alternatives.push(slot);
        }
        if (alternatives.length >= 3) break;
      }
      if (alternatives.length >= 3) break;
    }
    
    return alternatives;
  }
  
  private calculateMetrics(state: ScheduleState, request: SchedulerRequest): SchedulerMetrics {
    const totalRequests = request.requests.length;
    const scheduledCount = state.assignments.length;
    const unscheduledCount = state.unscheduled.length;
    
    const totalImportanceScore = state.assignments.reduce(
      (sum, a) => sum + a.score,
      0
    );
    
    // Calculate average host utilization
    const hostUtilizations: number[] = [];
    request.hosts.forEach(host => {
      const slots = state.hostSchedules.get(host.id) || [];
      const utilization = slots.length / (host.availability.length * 4); // Assume avg 4 slots/day
      hostUtilizations.push(utilization);
    });
    
    const averageHostUtilization = hostUtilizations.length > 0
      ? hostUtilizations.reduce((sum, u) => sum + u, 0) / hostUtilizations.length
      : 0;
    
    return {
      totalRequests,
      scheduledCount,
      unscheduledCount,
      totalImportanceScore,
      averageHostUtilization,
      constraintViolations: 0
    };
  }
}
