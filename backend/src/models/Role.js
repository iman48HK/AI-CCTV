import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    label: { type: String, required: true, trim: true },
    isSystem: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roleSchema.index({ key: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);

export default Role;
