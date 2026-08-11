import mongoose from 'mongoose';

const reviewRequestSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productHandle: { type: String, required: true },
    productTitle: { type: String, default: null },
    customerEmail: { type: String, required: true },
    customerName: { type: String, default: null },
    orderId: { type: String, default: null },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed'],
      default: 'queued',
    },
    source: {
      type: String,
      enum: ['dashboard', 'api', 'webhook'],
      default: 'api',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

reviewRequestSchema.index({ store: 1, createdAt: -1 });

const ReviewRequest = mongoose.model('ReviewRequest', reviewRequestSchema);
export default ReviewRequest;
