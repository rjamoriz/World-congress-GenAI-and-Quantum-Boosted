/**
 * Request Validation Schemas and Middleware
 * Provides Zod schemas for input validation across all routes
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Generic validation middleware factory
 * Validates req.body, req.query, or req.params against a Zod schema
 */
export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate body if schema provided
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      // Validate query params if schema provided
      if (schema.query) {
        req.query = schema.query.parse(req.query) as any;
      }
      
      // Validate route params if schema provided
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      
      next();
      
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        logger.warn('Request validation failed:', {
          path: req.path,
          method: req.method,
          errors: formattedErrors
        });
        
        next(new ValidationError(
          `Validation failed: ${formattedErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`
        ));
      } else {
        next(error);
      }
    }
  };
}

// ============================================================================
// Meeting Request Schemas
// ============================================================================

export const createMeetingRequestBody = z.object({
  companyName: z.string().min(1, 'Company name is required').trim(),
  companyTier: z.enum(['TIER1', 'TIER2', 'TIER3', 'UNKNOWN']).optional(),
  contactName: z.string().min(1, 'Contact name is required').trim(),
  contactEmail: z.string().email('Invalid email format').toLowerCase(),
  contactPhone: z.string().optional(),
  meetingType: z.enum([
    'KEYNOTE',
    'PANEL',
    'WORKSHOP',
    'NETWORKING',
    'DEMO',
    'CONSULTATION',
    'OTHER'
  ]),
  requestedTopics: z.array(z.string()).optional().default([]),
  preferredDates: z.array(z.string()).optional().default([]),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  metadata: z.record(z.any()).optional()
});

export const updateMeetingRequestBody = z.object({
  companyName: z.string().min(1).trim().optional(),
  contactName: z.string().min(1).trim().optional(),
  contactEmail: z.string().email().toLowerCase().optional(),
  contactPhone: z.string().optional(),
  meetingType: z.enum([
    'KEYNOTE',
    'PANEL',
    'WORKSHOP',
    'NETWORKING',
    'DEMO',
    'CONSULTATION',
    'OTHER'
  ]).optional(),
  requestedTopics: z.array(z.string()).optional(),
  status: z.enum([
    'PENDING',
    'QUALIFIED',
    'REJECTED',
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED'
  ]).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
}).partial();

export const bulkCreateRequestsBody = z.array(z.object({
  companyName: z.string().min(1).trim(),
  contactName: z.string().min(1).trim(),
  contactEmail: z.string().email().toLowerCase(),
  meetingType: z.enum([
    'strategic',
    'operational',
    'sales',
    'partnership',
    'technical',
    'keynote',
    'demo',
    'other'
  ])
})).min(1, 'At least one request is required');

// ============================================================================
// Host Schemas
// ============================================================================

export const createHostBody = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email format').toLowerCase(),
  role: z.string().min(1, 'Role is required').trim(),
  department: z.string().min(1, 'Department is required').trim(),
  expertise: z.array(z.string()).optional().default([]),
  maxMeetingsPerDay: z.number().int().min(1).max(12).optional().default(6),
  preferredMeetingTypes: z.array(z.enum([
    'KEYNOTE',
    'PANEL',
    'WORKSHOP',
    'NETWORKING',
    'DEMO',
    'CONSULTATION',
    'OTHER'
  ])).optional().default([]),
  isActive: z.boolean().optional().default(true)
});

export const updateHostBody = z.object({
  name: z.string().min(1).trim().optional(),
  email: z.string().email().toLowerCase().optional(),
  role: z.string().min(1).trim().optional(),
  department: z.string().min(1).trim().optional(),
  expertise: z.array(z.string()).optional(),
  maxMeetingsPerDay: z.number().int().min(1).max(12).optional(),
  isActive: z.boolean().optional()
}).partial();

// ============================================================================
// Scheduler Schemas
// ============================================================================

export const optimizeScheduleBody = z.object({
  requestIds: z.array(z.string()).optional(),
  algorithm: z.enum(['classical', 'quantum', 'hybrid']).optional().default('hybrid'),
  constraints: z.object({
    eventStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    eventEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
    workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
    meetingDurationMinutes: z.number().int().min(15).max(180),
    maxMeetingsPerDay: z.number().int().min(1).max(12),
    bufferMinutes: z.number().int().min(0).max(60).optional().default(15)
  }).optional(),
  quantumConfig: z.object({
    backend: z.enum(['dwave', 'qiskit', 'hybrid']).optional(),
    shots: z.number().int().min(1).optional(),
    timeout: z.number().int().min(1000).optional()
  }).optional()
});

export const manualAssignBody = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  hostId: z.string().min(1, 'Host ID is required'),
  timeSlot: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format')
  }),
  location: z.string().optional(),
  meetingLink: z.string().url().optional()
});

// ============================================================================
// Qualification Schemas
// ============================================================================

export const qualifyRequestParams = z.object({
  id: z.string().min(1, 'Request ID is required')
});

export const bulkQualifyBody = z.object({
  requestIds: z.array(z.string().min(1)).min(1, 'At least one request ID is required')
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const paginationQuery = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).partial();

export const meetingRequestQuery = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.enum(['PENDING', 'QUALIFIED', 'REJECTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  meetingType: z.enum(['KEYNOTE', 'PANEL', 'WORKSHOP', 'NETWORKING', 'DEMO', 'CONSULTATION', 'OTHER']).optional(),
  companyTier: z.enum(['TIER1', 'TIER2', 'TIER3', 'UNKNOWN']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).partial();

export const idParams = z.object({
  id: z.string().min(1, 'ID parameter is required')
});
