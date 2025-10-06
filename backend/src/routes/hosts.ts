/**
 * Hosts routes
 */

import { Router, Request, Response } from 'express';
import { HostModel } from '../models/Host';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { HTTP_STATUS, PAGINATION } from '@agenda-manager/shared';

const router = Router();

// GET /api/hosts - List all hosts
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { 
    page = PAGINATION.DEFAULT_PAGE, 
    limit = PAGINATION.DEFAULT_LIMIT,
    isActive,
    department
  } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;
  
  const filter: any = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (department) filter.department = department;
  
  const [hosts, total] = await Promise.all([
    HostModel.find(filter).skip(skip).limit(limitNum).lean(),
    HostModel.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: hosts.map(h => ({ ...h, id: h._id.toString() })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/hosts/:id - Get single host
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const host = await HostModel.findById(req.params.id).lean();
  
  if (!host) {
    throw new NotFoundError('Host not found');
  }
  
  res.json({
    success: true,
    data: { ...host, id: host._id.toString() },
    timestamp: new Date().toISOString()
  });
}));

// POST /api/hosts - Create new host
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const hostData = req.body;
  
  if (!hostData.name || !hostData.email || !hostData.role || !hostData.department) {
    throw new ValidationError('Missing required fields');
  }
  
  const newHost = await HostModel.create(hostData);
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: newHost.toJSON(),
    message: 'Host created successfully',
    timestamp: new Date().toISOString()
  });
}));

// PUT /api/hosts/:id - Update host
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  
  const host = await HostModel.findByIdAndUpdate(
    id,
    { ...updates, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  
  if (!host) {
    throw new NotFoundError('Host not found');
  }
  
  res.json({
    success: true,
    data: host.toJSON(),
    message: 'Host updated successfully',
    timestamp: new Date().toISOString()
  });
}));

// DELETE /api/hosts/:id - Delete host
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const host = await HostModel.findByIdAndDelete(id);
  
  if (!host) {
    throw new NotFoundError('Host not found');
  }
  
  res.status(HTTP_STATUS.NO_CONTENT).send();
}));

// POST /api/hosts/bulk - Bulk create hosts
router.post('/bulk', asyncHandler(async (req: Request, res: Response) => {
  const hosts = req.body;
  
  if (!Array.isArray(hosts)) {
    throw new ValidationError('Request body must be an array');
  }
  
  const createdHosts = await HostModel.insertMany(hosts);
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: createdHosts.map(h => h.toJSON()),
    message: `${createdHosts.length} hosts created`,
    timestamp: new Date().toISOString()
  });
}));

export default router;
