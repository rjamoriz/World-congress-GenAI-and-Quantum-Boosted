/**
 * Scheduler routes
 */

import { Router, Request, Response } from 'express';
import { ScheduledMeetingModel } from '../models/ScheduledMeeting';
import { MeetingRequestModel } from '../models/MeetingRequest';
import { HostModel } from '../models/Host';
import { schedulerRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { SchedulerService } from '../services/scheduler/SchedulerService';
import { RequestStatus, HTTP_STATUS } from '@agenda-manager/shared';
import { logger } from '../utils/logger';

const router = Router();
const schedulerService = new SchedulerService();

// POST /api/schedule/optimize - Run optimization
router.post('/optimize', schedulerRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { requestIds, constraints, algorithm, quantumConfig } = req.body;
  
  logger.info('Starting schedule optimization');
  
  // Fetch requests and hosts
  let requestQuery: any = { status: RequestStatus.QUALIFIED };
  if (requestIds && requestIds.length > 0) {
    requestQuery._id = { $in: requestIds };
  }
  
  const requests = await MeetingRequestModel.find(requestQuery).lean();
  
  const hosts = await HostModel.find({ isActive: true }).lean();
  
  // Default constraints if not provided
  const defaultConstraints = {
    eventStartDate: new Date().toISOString().split('T')[0], // Today
    eventEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    meetingDurationMinutes: 30,
    maxMeetingsPerDay: 8,
    bufferMinutes: 15
  };
  
  // Run scheduler
  const result = await schedulerService.optimize({
    requests: requests.map(r => ({ ...r, id: r._id.toString() })),
    hosts: hosts.map(h => ({ ...h, id: h._id.toString() })),
    constraints: constraints || defaultConstraints,
    algorithm,
    quantumConfig
  });
  
  // Save scheduled meetings to database
  const savedMeetings = [];
  for (const assignment of result.assignments) {
    try {
      logger.info(`Attempting to save meeting for request ${assignment.requestId}, host ${assignment.hostId}`);
      
      const scheduledMeeting = await ScheduledMeetingModel.create({
        requestId: assignment.requestId,
        hostId: assignment.hostId,
        timeSlot: {
          ...assignment.timeSlot,
          hostId: assignment.hostId
        },
        status: 'confirmed',
        materialsGenerated: false,
        followUpSent: false
      });
      
      logger.info(`Successfully created scheduled meeting: ${scheduledMeeting._id}`);
      
      // Update request status to scheduled
      const updatedRequest = await MeetingRequestModel.findByIdAndUpdate(assignment.requestId, {
        status: RequestStatus.SCHEDULED,
        scheduledAt: new Date()
      });
      
      if (updatedRequest) {
        logger.info(`Updated request ${assignment.requestId} status to scheduled`);
      } else {
        logger.warn(`Could not find request ${assignment.requestId} to update`);
      }
      
      savedMeetings.push(scheduledMeeting);
    } catch (error: any) {
      logger.error(`Failed to save meeting assignment for request ${assignment.requestId}:`, error.message);
      logger.error(`Error details:`, error);
    }
  }
  
  logger.info(`Optimization complete: ${result.assignments.length} meetings scheduled, ${savedMeetings.length} saved to database`);
  
  // Enhanced result with saved meetings info
  const enhancedResult = {
    ...result,
    savedMeetings: savedMeetings.length,
    explanation: `${result.explanation} - Successfully scheduled ${savedMeetings.length} meetings out of ${result.assignments.length} assignments.`
  };
  
  res.json({
    success: true,
    data: enhancedResult,
    timestamp: new Date().toISOString()
  });
}));

// POST /api/schedule/assign - Manually assign a meeting
router.post('/assign', asyncHandler(async (req: Request, res: Response) => {
  const { requestId, hostId, timeSlot, location, meetingLink } = req.body;
  
  // Check if request exists and is qualified
  const request = await MeetingRequestModel.findById(requestId);
  if (!request) {
    throw new NotFoundError('Meeting request not found');
  }
  
  // Check if host exists
  const host = await HostModel.findById(hostId);
  if (!host) {
    throw new NotFoundError('Host not found');
  }
  
  // Create scheduled meeting
  const scheduledMeeting = await ScheduledMeetingModel.create({
    requestId,
    hostId,
    timeSlot: { ...timeSlot, hostId },
    location,
    meetingLink,
    status: 'confirmed'
  });
  
  // Update request status
  request.status = RequestStatus.SCHEDULED;
  request.scheduledAt = new Date();
  await request.save();
  
  // Emit WebSocket event
  const io = req.app.get('io');
  io.emit('schedule:update', {
    type: 'assignment',
    data: scheduledMeeting.toJSON()
  });
  
  logger.info(`Meeting manually assigned: ${scheduledMeeting._id}`);
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: scheduledMeeting.toJSON(),
    message: 'Meeting scheduled successfully',
    timestamp: new Date().toISOString()
  });
}));

// GET /api/schedule - Get all scheduled meetings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { date, hostId, status } = req.query;
  
  const filter: any = {};
  if (date) filter['timeSlot.date'] = date;
  if (hostId) filter.hostId = hostId;
  if (status) filter.status = status;
  
  const meetings = await ScheduledMeetingModel.find(filter)
    .sort({ 'timeSlot.date': 1, 'timeSlot.startTime': 1 })
    .lean();
  
  res.json({
    success: true,
    data: meetings.map(m => ({ ...m, id: m._id.toString() })),
    timestamp: new Date().toISOString()
  });
}));

// GET /api/schedule/:id - Get single scheduled meeting
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const meeting = await ScheduledMeetingModel.findById(req.params.id).lean();
  
  if (!meeting) {
    throw new NotFoundError('Scheduled meeting not found');
  }
  
  res.json({
    success: true,
    data: { ...meeting, id: meeting._id.toString() },
    timestamp: new Date().toISOString()
  });
}));

// PUT /api/schedule/:id - Update scheduled meeting
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  
  const meeting = await ScheduledMeetingModel.findByIdAndUpdate(
    id,
    { ...updates, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  
  if (!meeting) {
    throw new NotFoundError('Scheduled meeting not found');
  }
  
  // Emit WebSocket event
  const io = req.app.get('io');
  io.emit('schedule:update', {
    type: 'update',
    data: meeting.toJSON()
  });
  
  res.json({
    success: true,
    data: meeting.toJSON(),
    message: 'Scheduled meeting updated',
    timestamp: new Date().toISOString()
  });
}));

// DELETE /api/schedule/:id - Cancel scheduled meeting
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const meeting = await ScheduledMeetingModel.findById(id);
  
  if (!meeting) {
    throw new NotFoundError('Scheduled meeting not found');
  }
  
  meeting.status = 'cancelled';
  await meeting.save();
  
  // Update request status back to qualified
  await MeetingRequestModel.findByIdAndUpdate(meeting.requestId, {
    status: RequestStatus.QUALIFIED
  });
  
  // Emit WebSocket event
  const io = req.app.get('io');
  io.emit('schedule:update', {
    type: 'cancellation',
    data: { id: meeting._id, requestId: meeting.requestId }
  });
  
  logger.info(`Meeting cancelled: ${id}`);
  
  res.json({
    success: true,
    message: 'Meeting cancelled successfully',
    timestamp: new Date().toISOString()
  });
}));

export default router;
