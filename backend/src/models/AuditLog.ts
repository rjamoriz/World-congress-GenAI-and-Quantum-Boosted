/**
 * MongoDB model for Audit Logs
 */

import mongoose, { Schema, Document } from 'mongoose';
import { AuditLog as IAuditLog } from '@agenda-manager/shared';

export interface AuditLogDocument extends Omit<IAuditLog, 'id'>, Document {}

const AuditLogSchema = new Schema<AuditLogDocument>({
  userId: { type: String, index: true },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  changes: { type: Schema.Types.Mixed },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true },
  ipAddress: { type: String },
  userAgent: { type: String }
}, {
  timestamps: false,
  toJSON: { 
    transform: (doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// TTL index - expire logs after 90 days
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export const AuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);
