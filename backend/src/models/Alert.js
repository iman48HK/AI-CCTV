import mongoose from 'mongoose';

export const ALERT_TYPES = {
  UNKNOWN_FACE: 'unknown_face',
  RECOGNIZED: 'recognized',
  FALL_DETECTED: 'fall_detected',
  INTRUSION: 'intrusion',
  OFFLINE_CAMERA: 'offline_camera',
  OTHER: 'other',
};

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(ALERT_TYPES),
      default: ALERT_TYPES.OTHER,
    },
    message: { type: String, required: true },
    camera: { type: mongoose.Schema.Types.ObjectId, ref: 'Camera', default: null },
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

alertSchema.index({ createdAt: -1 });
alertSchema.index({ type: 1 });
alertSchema.index({ message: 'text' });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
