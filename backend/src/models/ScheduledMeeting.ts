/**
 * MongoDB model for Scheduled Meetings
 */

import mongoose, { Schema, Document } from 'mongoose';
import { ScheduledMeeting as IScheduledMeeting } from '@agenda-manager/shared';

export interface ScheduledMeetingDocument extends Omit<IScheduledMeeting, 'id'>, Document {}

const TimeSlotSchema = new Schema({
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  hostId: { type: String, required: true }
}, { _id: false });

const ScheduledMeetingSchema = new Schema<ScheduledMeetingDocument>({
  requestId: { 
    type: String, 
    required: true, 
    ref: 'MeetingRequest',
    index: true 
  },
  timeSlot: { type: TimeSlotSchema, required: true },
  hostId: { 
    type: String, 
    required: true, 
    ref: 'Host',
    index: true 
  },
  location: { type: String, trim: true },
  meetingLink: { type: String, trim: true },
  status: {
    type: String,
    enum: ['confirmed', 'tentative', 'cancelled'],
    default: 'tentative',
    index: true
  },
  materialsGenerated: { type: Boolean, default: false },
  followUpSent: { type: Boolean, default: false },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
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
ScheduledMeetingSchema.index({ 'timeSlot.date': 1, 'timeSlot.startTime': 1 });
ScheduledMeetingSchema.index({ status: 1 });

// Pre-save middleware
ScheduledMeetingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const ScheduledMeetingModel = mongoose.model<ScheduledMeetingDocument>(
  'ScheduledMeeting',
  ScheduledMeetingSchema
);
