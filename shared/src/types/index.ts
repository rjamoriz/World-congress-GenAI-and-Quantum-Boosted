/**
 * Shared TypeScript types for the Agenda Manager application
 */

// ==================== Enums ====================

export enum RequestStatus {
  PENDING = 'pending',
  QUALIFIED = 'qualified',
  REJECTED = 'rejected',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum MeetingType {
  STRATEGIC = 'strategic',
  OPERATIONAL = 'operational',
  SALES = 'sales',
  PARTNERSHIP = 'partnership',
  TECHNICAL = 'technical',
  KEYNOTE = 'keynote',
  DEMO = 'demo',
  OTHER = 'other'
}

export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum CompanyTier {
  TIER_1 = 'tier_1', // Fortune 500, strategic partners
  TIER_2 = 'tier_2', // Major companies, established partners
  TIER_3 = 'tier_3', // Growing companies, potential partners
  TIER_4 = 'tier_4', // Startups, small businesses
  UNKNOWN = 'unknown'
}

export enum SchedulerAlgorithm {
  QUANTUM = 'quantum',
  CLASSICAL = 'classical',
  HYBRID = 'hybrid'
}

export enum WorkflowStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// ==================== Core Domain Types ====================

export interface MeetingRequest {
  id: string;
  companyName: string;
  companyTier: CompanyTier;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  meetingType: MeetingType;
  requestedTopics: string[];
  preferredDates?: string[]; // ISO date strings
  preferredTimeSlots?: TimeSlot[];
  urgency: Priority;
  status: RequestStatus;
  importanceScore?: number; // 0-100, set by qualification service
  qualificationReason?: string;
  fraudScore?: number; // 0-1, higher = more suspicious
  isDuplicate?: boolean;
  metadata?: Record<string, any>;
  submittedAt: Date;
  qualifiedAt?: Date;
  scheduledAt?: Date;
  createdBy?: string;
  updatedAt: Date;
}

export interface TimeSlot {
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  hostId?: string;
}

export interface ScheduledMeeting {
  id: string;
  requestId: string;
  timeSlot: TimeSlot;
  hostId: string;
  location?: string;
  meetingLink?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  materialsGenerated: boolean;
  followUpSent: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Host {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  expertise: string[];
  availability: HostAvailability[];
  maxMeetingsPerDay: number;
  preferredMeetingTypes: MeetingType[];
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface HostAvailability {
  date: string; // ISO date string
  timeSlots: TimeSlot[];
  isBlocked?: boolean;
  blockReason?: string;
}

// ==================== Qualification Service ====================

export interface QualificationRequest {
  requestId: string;
  companyName: string;
  contactEmail: string;
  meetingType: MeetingType;
  requestedTopics: string[];
  metadata?: Record<string, any>;
}

export interface QualificationResult {
  requestId: string;
  isQualified: boolean;
  importanceScore: number; // 0-100
  reason: string;
  confidence: number; // 0-1
  suggestedMeetingType?: MeetingType;
  suggestedHost?: string;
  fraudScore: number;
  isDuplicate: boolean;
  duplicateOf?: string[];
  processingTimeMs: number;
}

// ==================== Scheduler Service ====================

export interface SchedulerRequest {
  requests: MeetingRequest[];
  hosts: Host[];
  constraints: SchedulerConstraints;
  algorithm?: SchedulerAlgorithm;
  quantumConfig?: QuantumConfig;
}

export interface QuantumConfig {
  backend: string;
  shots: number;
  layers: number;
  optimizer: string;
  maxIterations: number;
}

export interface SchedulerConstraints {
  eventStartDate: string; // ISO date string
  eventEndDate: string; // ISO date string
  workingHoursStart: string; // HH:mm
  workingHoursEnd: string; // HH:mm
  meetingDurationMinutes: number;
  maxMeetingsPerDay: number;
  bufferMinutes?: number; // Buffer between meetings
  prioritizeHighImportance?: boolean;
}

export interface SchedulerResult {
  assignments: MeetingAssignment[];
  unscheduled: UnscheduledRequest[];
  metrics: SchedulerMetrics;
  algorithm: SchedulerAlgorithm;
  computationTimeMs: number;
  explanation?: string;
}

export interface MeetingAssignment {
  requestId: string;
  hostId: string;
  timeSlot: TimeSlot;
  score: number; // Quality score of this assignment
  explanation: string;
}

export interface UnscheduledRequest {
  requestId: string;
  reason: string;
  alternativeSuggestions?: TimeSlot[];
}

export interface SchedulerMetrics {
  totalRequests: number;
  scheduledCount: number;
  unscheduledCount: number;
  totalImportanceScore: number;
  averageHostUtilization: number;
  constraintViolations: number;
}

// ==================== Workflow Service ====================

export interface MaterialsGenerationRequest {
  meetingId: string;
  requestData: MeetingRequest;
  hostData: Host;
  includeCompanyResearch?: boolean;
  includeAgenda?: boolean;
  includePresentation?: boolean;
}

export interface MaterialsGenerationResult {
  meetingId: string;
  briefingDocument?: string; // Markdown content
  agenda?: string[];
  presentation?: string; // URL or content
  companyResearch?: string;
  status: WorkflowStatus;
  generatedAt: Date;
}

export interface FollowUpRequest {
  meetingId: string;
  recipientEmail: string;
  recipientName: string;
  meetingNotes?: string;
  actionItems?: string[];
  nextSteps?: string[];
  attachments?: string[];
}

export interface FollowUpResult {
  meetingId: string;
  emailSent: boolean;
  emailContent?: string;
  sentAt?: Date;
  error?: string;
}

// ==================== API Response Types ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== Audit & Observability ====================

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface ExplainabilityRecord {
  requestId: string;
  decision: string;
  factors: ExplainabilityFactor[];
  confidence: number;
  timestamp: Date;
}

export interface ExplainabilityFactor {
  name: string;
  weight: number;
  value: any;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

// ==================== WebSocket Events ====================

export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: string;
}

export interface ScheduleUpdateEvent extends WebSocketEvent {
  type: 'schedule:update';
  payload: {
    meetingId: string;
    status: string;
    timeSlot?: TimeSlot;
  };
}

export interface QualificationUpdateEvent extends WebSocketEvent {
  type: 'qualification:complete';
  payload: {
    requestId: string;
    result: QualificationResult;
  };
}

// ==================== Integration Types ====================

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  body: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees: Array<{ emailAddress: { address: string; name: string } }>;
  location?: string;
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Industry?: string;
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  BillingCountry?: string;
  Type?: string;
}
