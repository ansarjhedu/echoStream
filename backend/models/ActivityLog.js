import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: {
      type: String,
      required: true,
      enum: [
        'review.hide',
        'review.unhide',
        'review.reply',
        'review.import',
        'product.hide',
        'product.unhide',
        'campaign.send',
        'campaign.schedule',
        'widget.publish',
        'review.request',
      ],
      index: true,
    },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ store: 1, createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
