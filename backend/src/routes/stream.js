import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRequired } from '../middleware/auth.js';
import * as streamTranscode from '../services/stream-transcode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

router.get('/thumbnail/:cameraId', authRequired, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const thumbPath = await streamTranscode.getThumbnailPath(cameraId);
    if (!thumbPath) {
      return res.status(404).json({ error: 'No thumbnail available' });
    }
    res.type('image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.sendFile(path.resolve(thumbPath));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to get thumbnail' });
  }
});

router.post('/start/:cameraId', authRequired, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { hlsUrl } = await streamTranscode.startTranscode(cameraId);
    res.json({ hlsUrl });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to start stream' });
  }
});

router.post('/stop/:cameraId', authRequired, (req, res) => {
  streamTranscode.stopTranscode(req.params.cameraId);
  res.json({ ok: true });
});

router.use('/hls', authRequired, express.static(streamTranscode.getHlsDir(), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/MP2T');
    }
  },
}));

export default router;
