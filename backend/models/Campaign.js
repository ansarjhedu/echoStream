import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    bodyText: { type: String, required: true },
    filters: {
      productId: { type: String, default: null },
      emailSearch: { type: String, default: null },
      minRating: { type: Number, default: null },
    },
    /** Snapshot of emails to send when status is scheduled */
    recipientEmails: { type: [String], default: [] },
    scheduledAt: { type: Date, default: null, index: true },
    recipientCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    suppressedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'partial'],
      default: 'sent',
    },
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1, scheduledAt: 1 });

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
