/**
 * Meeting requests routes
 */

import { Router, Request, Response } from 'express';
import { MeetingRequestModel } from '../models/MeetingRequest';
import { AuditLogModel } from '../models/AuditLog';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { HTTP_STATUS, AUDIT_ACTIONS, PAGINATION } from '@agenda-manager/shared';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/requests - List all requests with pagination and filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { 
    page = PAGINATION.DEFAULT_PAGE, 
    limit = PAGINATION.DEFAULT_LIMIT,
    status,
    meetingType,
    companyTier,
    sortBy = 'submittedAt',
    sortOrder = 'desc'
  } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;
  
  // Build filter query
  const filter: any = {};
  if (status) filter.status = status;
  if (meetingType) filter.meetingType = meetingType;
  if (companyTier) filter.companyTier = companyTier;
  
  // Build sort options
  const sort: any = {};
  sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
  
  const [requests, total] = await Promise.all([
    MeetingRequestModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    MeetingRequestModel.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: requests.map(r => ({ ...r, id: r._id.toString() })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/requests/:id - Get single request
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const request = await MeetingRequestModel.findById(req.params.id).lean();
  
  if (!request) {
    throw new NotFoundError('Meeting request not found');
  }
  
  res.json({
    success: true,
    data: { ...request, id: request._id.toString() },
    timestamp: new Date().toISOString()
  });
}));

// POST /api/requests - Create new request
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const requestData = req.body;
  
  // Basic validation
  if (!requestData.companyName || !requestData.contactEmail || !requestData.meetingType) {
    throw new ValidationError('Missing required fields: companyName, contactEmail, meetingType');
  }
  
  const newRequest = await MeetingRequestModel.create(requestData);
  
  // Audit log
  await AuditLogModel.create({
    action: AUDIT_ACTIONS.CREATE,
    resource: 'MeetingRequest',
    resourceId: (newRequest._id as any).toString(),
    metadata: { companyName: requestData.companyName },
    timestamp: new Date(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  
  logger.info(`New meeting request created: ${(newRequest._id as any).toString()}`);
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: newRequest.toJSON(),
    message: 'Meeting request created successfully',
    timestamp: new Date().toISOString()
  });
}));

// PUT /api/requests/:id - Update request
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  
  const request = await MeetingRequestModel.findById(id);
  
  if (!request) {
    throw new NotFoundError('Meeting request not found');
  }
  
  const oldData = request.toObject();
  
  Object.assign(request, updates);
  request.updatedAt = new Date();
  await request.save();
  
  // Audit log
  await AuditLogModel.create({
    action: AUDIT_ACTIONS.UPDATE,
    resource: 'MeetingRequest',
    resourceId: id,
    changes: { before: oldData, after: request.toObject() },
    timestamp: new Date(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  
  logger.info(`Meeting request updated: ${id}`);
  
  res.json({
    success: true,
    data: request.toJSON(),
    message: 'Meeting request updated successfully',
    timestamp: new Date().toISOString()
  });
}));

// DELETE /api/requests/:id - Delete request
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const request = await MeetingRequestModel.findByIdAndDelete(id);
  
  if (!request) {
    throw new NotFoundError('Meeting request not found');
  }
  
  // Audit log
  await AuditLogModel.create({
    action: AUDIT_ACTIONS.DELETE,
    resource: 'MeetingRequest',
    resourceId: id,
    metadata: { companyName: request.companyName },
    timestamp: new Date(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  
  logger.info(`Meeting request deleted: ${id}`);
  
  res.status(HTTP_STATUS.NO_CONTENT).send();
}));

// POST /api/requests/bulk - Bulk create requests (for data import)
router.post('/bulk', asyncHandler(async (req: Request, res: Response) => {
  const requests = req.body;
  
  if (!Array.isArray(requests)) {
    throw new ValidationError('Request body must be an array');
  }
  
  const createdRequests = await MeetingRequestModel.insertMany(requests);
  
  logger.info(`Bulk created ${createdRequests.length} meeting requests`);
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: createdRequests.map(r => r.toJSON()),
    message: `${createdRequests.length} meeting requests created`,
    timestamp: new Date().toISOString()
  });
}));

export default router;
