/**
 * Workflow automation routes
 */

import { Router, Request, Response } from 'express';
import { ScheduledMeetingModel } from '../models/ScheduledMeeting';
import { MeetingRequestModel } from '../models/MeetingRequest';
import { HostModel } from '../models/Host';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { WorkflowService } from '../services/workflow/WorkflowService';
import { HTTP_STATUS } from '@agenda-manager/shared';
import { logger } from '../utils/logger';

const router = Router();
const workflowService = new WorkflowService();

// POST /api/workflow/materials/:meetingId - Generate materials for a meeting
router.post('/materials/:meetingId', asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const { includeCompanyResearch, includeAgenda, includePresentation } = req.body;
  
  const meeting = await ScheduledMeetingModel.findById(meetingId);
  if (!meeting) {
    throw new NotFoundError('Scheduled meeting not found');
  }
  
  const request = await MeetingRequestModel.findById(meeting.requestId);
  const host = await HostModel.findById(meeting.hostId);
  
  if (!request || !host) {
    throw new NotFoundError('Request or host not found');
  }
  
  logger.info(`Generating materials for meeting: ${meetingId}`);
  
  const result = await workflowService.generateMaterials({
    meetingId,
    requestData: { ...request.toObject(), id: request._id.toString() },
    hostData: { ...host.toObject(), id: host._id.toString() },
    includeCompanyResearch,
    includeAgenda,
    includePresentation
  });
  
  // Update meeting
  meeting.materialsGenerated = true;
  await meeting.save();
  
  logger.info(`Materials generated for meeting: ${meetingId}`);
  
  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

// POST /api/workflow/follow-up/:meetingId - Send follow-up email
router.post('/follow-up/:meetingId', asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const { meetingNotes, actionItems, nextSteps, attachments } = req.body;
  
  const meeting = await ScheduledMeetingModel.findById(meetingId);
  if (!meeting) {
    throw new NotFoundError('Scheduled meeting not found');
  }
  
  const request = await MeetingRequestModel.findById(meeting.requestId);
  if (!request) {
    throw new NotFoundError('Request not found');
  }
  
  logger.info(`Sending follow-up for meeting: ${meetingId}`);
  
  const result = await workflowService.sendFollowUp({
    meetingId,
    recipientEmail: request.contactEmail,
    recipientName: request.contactName,
    meetingNotes,
    actionItems,
    nextSteps,
    attachments
  });
  
  // Update meeting
  meeting.followUpSent = true;
  if (meetingNotes) {
    meeting.notes = meetingNotes;
  }
  await meeting.save();
  
  logger.info(`Follow-up sent for meeting: ${meetingId}`);
  
  res.json({
    success: true,
    data: result,
    message: 'Follow-up email sent successfully',
    timestamp: new Date().toISOString()
  });
}));

// POST /api/workflow/export - Export schedule to Excel
router.post('/export', asyncHandler(async (req: Request, res: Response) => {
  const { date, hostId } = req.body;
  
  const filter: any = {};
  if (date) filter['timeSlot.date'] = date;
  if (hostId) filter.hostId = hostId;
  
  const meetings = await ScheduledMeetingModel.find(filter)
    .sort({ 'timeSlot.date': 1, 'timeSlot.startTime': 1 })
    .lean();
  
  logger.info(`Exporting ${meetings.length} meetings to Excel`);
  
  const excelBuffer = await workflowService.exportToExcel(
    meetings.map(m => ({ ...m, id: m._id.toString() }))
  );
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=schedule-${Date.now()}.xlsx`);
  res.send(excelBuffer);
}));

// GET /api/workflow/status/:meetingId - Get workflow status
router.get('/status/:meetingId', asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.params;
  
  const meeting = await ScheduledMeetingModel.findById(meetingId);
  if (!meeting) {
    throw new NotFoundError('Scheduled meeting not found');
  }
  
  res.json({
    success: true,
    data: {
      meetingId,
      materialsGenerated: meeting.materialsGenerated,
      followUpSent: meeting.followUpSent,
      status: meeting.status
    },
    timestamp: new Date().toISOString()
  });
}));

export default router;
