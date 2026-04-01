import express from 'express';
import Person from '../models/Person.js';
import compreface from '../services/compreface.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

/**
 * Sync all People from Capture to CompreFace.
 * Registers each person's photos as a subject for recognition.
 */
router.post('/sync', authRequired, async (req, res) => {
  try {
    if (!compreface.isConfigured()) {
      return res.status(503).json({
        error: 'CompreFace not configured. Set COMPREFACE_URL and COMPREFACE_RECOGNITION_API_KEY.',
      });
    }

    const people = await Person.find();
    let synced = 0;
    const errors = [];

    for (const p of people) {
      try {
        await compreface.deleteSubject(p.name);
        for (const photo of p.photos || []) {
          await compreface.addFaceToSubject(p.name, photo);
        }
        synced++;
      } catch (e) {
        errors.push({ name: p.name, error: e.message });
      }
    }

    res.json({ synced, total: people.length, errors });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;
