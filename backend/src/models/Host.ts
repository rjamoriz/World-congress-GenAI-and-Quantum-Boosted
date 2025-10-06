/**
 * MongoDB model for Hosts
 */

import mongoose, { Schema, Document } from 'mongoose';
import { Host as IHost, MeetingType } from '@agenda-manager/shared';

export interface HostDocument extends Omit<IHost, 'id'>, Document {}

const TimeSlotSchema = new Schema({
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
}, { _id: false });

const HostAvailabilitySchema = new Schema({
  date: { type: String, required: true },
  timeSlots: [TimeSlotSchema],
  isBlocked: { type: Boolean, default: false },
  blockReason: { type: String }
}, { _id: false });

const HostSchema = new Schema<HostDocument>({
  name: { type: String, required: true, trim: true, index: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  role: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true, index: true },
  expertise: [{ type: String, trim: true }],
  availability: [HostAvailabilitySchema],
  maxMeetingsPerDay: { type: Number, required: true, min: 1, max: 12, default: 6 },
  preferredMeetingTypes: [{ 
    type: String, 
    enum: Object.values(MeetingType)
  }],
  isActive: { type: Boolean, default: true, index: true },
  metadata: { type: Schema.Types.Mixed }
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
HostSchema.index({ name: 'text', expertise: 'text' });
HostSchema.index({ isActive: 1, department: 1 });

export const HostModel = mongoose.model<HostDocument>('Host', HostSchema);
