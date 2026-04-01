import mongoose from 'mongoose';

const cameraSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    streamUrl: { type: String, default: '' },
    location: { type: String, default: '' },
    sitePlan: { type: mongoose.Schema.Types.ObjectId, ref: 'SitePlan', default: null },
    pinX: { type: Number, default: null },
    pinY: { type: Number, default: null },
    facialFallDetection: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Camera = mongoose.model('Camera', cameraSchema);

export default Camera;
