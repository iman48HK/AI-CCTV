import mongoose from 'mongoose';

const sitePlanSchema = new mongoose.Schema(
  {
    planId: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '', trim: true },
    filename: { type: String, required: true },
    mimeType: { type: String, default: 'image/jpeg' },
  },
  { timestamps: true }
);

export default mongoose.model('SitePlan', sitePlanSchema);
