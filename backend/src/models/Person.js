import mongoose from 'mongoose';

/**
 * Person - external people for face detection (NOT internal system users).
 * Each person has a name and exactly 5 photos used for identification.
 */
const personSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    notes: { type: String, default: '', trim: true },
    photos: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 5 && v.every((p) => typeof p === 'string' && p.length > 0),
        message: 'Exactly 5 photos (base64 data URLs) are required for identification',
      },
    },
  },
  { timestamps: true }
);

personSchema.index({ name: 1 });

const Person = mongoose.model('Person', personSchema);

export default Person;
