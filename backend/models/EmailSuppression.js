import mongoose from 'mongoose';

const emailSuppressionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
      index: true,
    },
    reason: {
      type: String,
      enum: ['unsubscribe', 'bounce', 'complaint', 'manual'],
      default: 'unsubscribe',
    },
  },
  { timestamps: true }
);

emailSuppressionSchema.index({ email: 1, store: 1 }, { unique: true });

const EmailSuppression = mongoose.model('EmailSuppression', emailSuppressionSchema);
export default EmailSuppression;
