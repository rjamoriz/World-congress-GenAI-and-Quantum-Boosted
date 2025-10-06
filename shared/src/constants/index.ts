/**
 * Shared constants for the Agenda Manager application
 */

export const DEFAULT_MEETING_DURATION = 30; // minutes
export const DEFAULT_BUFFER_MINUTES = 15; // minutes between meetings
export const DEFAULT_MAX_MEETINGS_PER_DAY = 8;
export const DEFAULT_WORKING_HOURS_START = '09:00';
export const DEFAULT_WORKING_HOURS_END = '18:00';

export const IMPORTANCE_SCORE_THRESHOLDS = {
  CRITICAL: 90,
  HIGH: 70,
  MEDIUM: 50,
  LOW: 0
} as const;

export const FRAUD_SCORE_THRESHOLD = 0.7; // Scores above this are suspicious

export const QUALIFICATION_CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence to auto-qualify

export const API_RATE_LIMITS = {
  DEFAULT: 100, // requests per window
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  SCHEDULER: 10, // More expensive operations
  GENAI: 20
} as const;

export const COMPANY_TIER_WEIGHTS = {
  tier_1: 1.0,
  tier_2: 0.8,
  tier_3: 0.6,
  tier_4: 0.4,
  unknown: 0.2
} as const;

export const MEETING_TYPE_WEIGHTS = {
  strategic: 1.0,
  partnership: 0.9,
  sales: 0.8,
  keynote: 0.85,
  technical: 0.75,
  operational: 0.7,
  demo: 0.65,
  other: 0.5
} as const;

export const SCHEDULER_TIMEOUTS = {
  CLASSICAL_MS: 30000, // 30 seconds
  QUANTUM_MS: 60000, // 60 seconds
  HYBRID_MS: 45000 // 45 seconds
} as const;

export const WEBSOCKET_EVENTS = {
  SCHEDULE_UPDATE: 'schedule:update',
  QUALIFICATION_COMPLETE: 'qualification:complete',
  WORKFLOW_UPDATE: 'workflow:update',
  ERROR: 'error',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect'
} as const;

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  SCHEDULE: 'schedule',
  RESCHEDULE: 'reschedule',
  CANCEL: 'cancel'
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  SCHEDULER_ERROR: 'SCHEDULER_ERROR',
  GENAI_ERROR: 'GENAI_ERROR',
  WORKFLOW_ERROR: 'WORKFLOW_ERROR',
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const;
