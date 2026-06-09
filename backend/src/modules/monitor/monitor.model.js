import mongoose from 'mongoose';

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
    },
    method: {
      type: String,
      default: 'GET',
    },
    interval: {
      type: Number,
      default: 60000,
    }, // ms (60s)
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// fast lookup by activity
monitorSchema.index({ active: 1 });

export default mongoose.model('Monitor', monitorSchema);
