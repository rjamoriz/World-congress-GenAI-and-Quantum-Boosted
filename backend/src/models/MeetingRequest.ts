/**
 * MongoDB model for Meeting Requests
 */

import mongoose, { Schema, Document } from 'mongoose';
import {
  MeetingRequest as IMeetingRequest,
  RequestStatus,
  MeetingType,
  Priority,
  CompanyTier
} from '@agenda-manager/shared';

export interface MeetingRequestDocument extends Omit<IMeetingRequest, 'id'>, Document {}

const TimeSlotSchema = new Schema({
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  hostId: { type: String }
}, { _id: false });

const MeetingRequestSchema = new Schema<MeetingRequestDocument>({
  companyName: { type: String, required: true, trim: true, index: true },
  companyTier: { 
    type: String, 
    enum: Object.values(CompanyTier),
    default: CompanyTier.UNKNOWN
  },
  contactName: { type: String, required: true, trim: true },
  contactEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
  contactPhone: { type: String, trim: true },
  meetingType: { 
    type: String, 
    enum: Object.values(MeetingType),
    required: true,
    index: true
  },
  requestedTopics: [{ type: String, trim: true }],
  preferredDates: [{ type: String }],
  preferredTimeSlots: [TimeSlotSchema],
  urgency: { 
    type: String, 
    enum: Object.values(Priority),
    default: Priority.MEDIUM
  },
  status: { 
    type: String, 
    enum: Object.values(RequestStatus),
    default: RequestStatus.PENDING,
    index: true
  },
  importanceScore: { type: Number, min: 0, max: 100 },
  qualificationReason: { type: String },
  fraudScore: { type: Number, min: 0, max: 1 },
  isDuplicate: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed },
  submittedAt: { type: Date, required: true, default: Date.now, index: true },
  qualifiedAt: { type: Date },
  scheduledAt: { type: Date },
  createdBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { 
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
MeetingRequestSchema.index({ companyName: 'text', requestedTopics: 'text' });
MeetingRequestSchema.index({ submittedAt: -1 });
MeetingRequestSchema.index({ status: 1, importanceScore: -1 });

// Pre-save middleware
MeetingRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const MeetingRequestModel = mongoose.model<MeetingRequestDocument>(
  'MeetingRequest',
  MeetingRequestSchema
);
