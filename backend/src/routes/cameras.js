import express from 'express';
import Camera from '../models/Camera.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired);

router.get('/', async (req, res) => {
  try {
    const cameras = await Camera.find().sort({ name: 1 }).populate('sitePlan');
    res.json(cameras);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to load cameras' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, streamUrl, location, sitePlanId, pinX, pinY, facialFallDetection } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const created = await Camera.create({
      name: name.trim(),
      streamUrl: (streamUrl || '').trim(),
      location: (location || '').trim(),
      sitePlan: sitePlanId || null,
      pinX: typeof pinX === 'number' ? pinX : null,
      pinY: typeof pinY === 'number' ? pinY : null,
      facialFallDetection: Boolean(facialFallDetection),
    });
    const populated = await Camera.findById(created._id).populate('sitePlan');
    res.status(201).json(populated);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    const msg = err.message || 'Failed to create camera';
    res.status(500).json({ error: msg });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, streamUrl, location, sitePlanId, pinX, pinY, facialFallDetection } = req.body;
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (streamUrl !== undefined) update.streamUrl = String(streamUrl).trim();
    if (location !== undefined) update.location = String(location).trim();
    if (sitePlanId !== undefined) update.sitePlan = sitePlanId || null;
    if (pinX !== undefined) update.pinX = typeof pinX === 'number' ? pinX : null;
    if (pinY !== undefined) update.pinY = typeof pinY === 'number' ? pinY : null;
    if (facialFallDetection !== undefined) update.facialFallDetection = Boolean(facialFallDetection);
    const updated = await Camera.findByIdAndUpdate(id, { $set: update }, { new: true }).populate('sitePlan');
    if (!updated) return res.status(404).json({ error: 'Camera not found' });
    res.json(updated);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to update camera' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Camera.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Camera not found' });
    res.status(204).end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

export default router;
