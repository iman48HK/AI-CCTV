import express from 'express';
import compreface from '../services/compreface.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authRequired, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'image (base64 data URL) is required' });
    }

    if (!compreface.isConfigured()) {
      return res.status(503).json({
        error: 'Face recognition not configured. Set COMPREFACE_URL and COMPREFACE_RECOGNITION_API_KEY.',
      });
    }

    const result = await compreface.recognize(image);
    if (result.error) {
      return res.status(502).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Recognition failed' });
  }
});

export default router;
