import mongoose from 'mongoose';
import crypto from 'crypto';

const monitorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
      default: 'GET',
    },
    interval: {
      type: Number,
      default: 60000,
      min: 30000,
      max: 86400000,
    },
    timeoutMs: {
      type: Number,
      default: 10000,
      min: 1000,
      max: 30000,
    },
    expectedStatusCodes: {
      type: [Number],
      default: [],
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    body: {
      type: String,
      default: '',
      maxlength: 10000,
    },
    responseKeyword: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    notificationEmails: {
      type: [String],
      default: [],
    },
    publicStatusEnabled: {
      type: Boolean,
      default: true,
    },
    publicSlug: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastCheckedAt: Date,
    lastStatus: {
      type: String,
      enum: ['UP', 'DOWN', 'PENDING'],
      default: 'PENDING',
    },
    lastResponseTime: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// fast lookup by activity
monitorSchema.index({ active: 1 });

monitorSchema.pre('validate', function ensurePublicSlug(next) {
  if (!this.publicSlug) {
    this.publicSlug = crypto.randomBytes(8).toString('hex');
  }
  next();
});

export default mongoose.model('Monitor', monitorSchema);
