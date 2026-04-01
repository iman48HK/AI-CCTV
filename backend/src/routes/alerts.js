import express from 'express';
import Alert from '../models/Alert.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired);

router.get('/', async (req, res) => {
  try {
    const { search, from, to, type, limit = 50 } = req.query;
    const filter = {};

    if (search && String(search).trim()) {
      filter.$or = [
        { message: { $regex: String(search).trim(), $options: 'i' } },
        { type: { $regex: String(search).trim(), $options: 'i' } },
      ];
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
    }

    if (type && String(type).trim()) {
      filter.type = String(type).trim();
    }

    const alerts = await Alert.find(filter)
      .populate('camera', 'name location')
      .populate('person', 'name')
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200))
      .lean();

    res.json(alerts);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to load alerts' });
  }
});

export default router;
