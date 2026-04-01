import mongoose from 'mongoose';

export const USER_ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  DEPARTMENT_ADMIN: 'department_admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  WORKER: 'worker',
  OTHER: 'other',
};

const avatarSchema = new mongoose.Schema(
  {
    url: { type: String },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, required: true, trim: true },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    avatar: avatarSchema,
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject({ virtuals: false });
  delete obj.passwordHash;
  return JSON.parse(JSON.stringify(obj));
};

const User = mongoose.model('User', userSchema);

export default User;

