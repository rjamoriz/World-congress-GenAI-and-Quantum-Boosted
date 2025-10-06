/**
 * Qualification routes
 */

import { Router, Request, Response } from 'express';
import { MeetingRequestModel } from '../models/MeetingRequest';
import { genAIRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { QualificationService } from '../services/genai/QualificationService';
import { RequestStatus, HTTP_STATUS } from '@agenda-manager/shared';
import { logger } from '../utils/logger';

const router = Router();
const qualificationService = new QualificationService();

// POST /api/qualification/qualify/:id - Qualify a single request
router.post('/qualify/:id', genAIRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const request = await MeetingRequestModel.findById(id);
  
  if (!request) {
    throw new NotFoundError('Meeting request not found');
  }
  
  if (request.status !== RequestStatus.PENDING) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Request has already been qualified',
      timestamp: new Date().toISOString()
    });
  }
  
  logger.info(`Qualifying request: ${id}`);
  
  // Run qualification
  const result = await qualificationService.qualify({
    requestId: id,
    companyName: request.companyName,
    contactEmail: request.contactEmail,
    meetingType: request.meetingType,
    requestedTopics: request.requestedTopics,
    metadata: request.metadata
  });
  
  // Update request with qualification results
  request.status = result.isQualified ? RequestStatus.QUALIFIED : RequestStatus.REJECTED;
  request.importanceScore = result.importanceScore;
  request.qualificationReason = result.reason;
  request.fraudScore = result.fraudScore;
  request.isDuplicate = result.isDuplicate;
  request.qualifiedAt = new Date();
  
  await request.save();
  
  // Emit WebSocket event
  const io = req.app.get('io');
  io.emit('qualification:complete', {
    requestId: id,
    result
  });
  
  logger.info(`Qualification complete: ${id} - ${result.isQualified ? 'QUALIFIED' : 'REJECTED'}`);
  
  return res.json({
    success: true,
    data: {
      request: request.toJSON(),
      qualification: result
    },
    timestamp: new Date().toISOString()
  });
}));

// POST /api/qualification/qualify-batch - Qualify multiple requests
router.post('/qualify-batch', genAIRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { requestIds } = req.body;
  
  if (!Array.isArray(requestIds)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'requestIds must be an array',
      timestamp: new Date().toISOString()
    });
  }
  
  logger.info(`Batch qualifying ${requestIds.length} requests`);
  
  const results = [];
  
  for (const requestId of requestIds) {
    try {
      const request = await MeetingRequestModel.findById(requestId);
      
      if (!request || request.status !== RequestStatus.PENDING) {
        continue;
      }
      
      const qualificationResult = await qualificationService.qualify({
        requestId,
        companyName: request.companyName,
        contactEmail: request.contactEmail,
        meetingType: request.meetingType,
        requestedTopics: request.requestedTopics,
        metadata: request.metadata
      });
      
      request.status = qualificationResult.isQualified 
        ? RequestStatus.QUALIFIED 
        : RequestStatus.REJECTED;
      request.importanceScore = qualificationResult.importanceScore;
      request.qualificationReason = qualificationResult.reason;
      request.fraudScore = qualificationResult.fraudScore;
      request.isDuplicate = qualificationResult.isDuplicate;
      request.qualifiedAt = new Date();
      
      await request.save();
      
      results.push({
        requestId,
        success: true,
        result: qualificationResult
      });
    } catch (error: any) {
      logger.error(`Failed to qualify request ${requestId}:`, error);
      results.push({
        requestId,
        success: false,
        error: error.message
      });
    }
  }
  
  logger.info(`Batch qualification complete: ${results.length} processed`);
  
  return res.json({
    success: true,
    data: results,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/qualification/stats - Get qualification statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await MeetingRequestModel.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgImportanceScore: { $avg: '$importanceScore' }
      }
    }
  ]);
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
}));

export default router;
