import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';
import { fileURLToPath } from 'url';
import SitePlan from '../models/SitePlan.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { USER_ROLES } from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(path.dirname(__dirname), 'uploads', 'siteplans');

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    cb(null, `sp-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images and PDF allowed'));
  },
});

const router = express.Router();

router.use(authRequired, requireRoles(USER_ROLES.SYSTEM_ADMIN));

router.get('/', async (req, res) => {
  try {
    const plans = await SitePlan.find().sort({ planId: 1 });
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load site plans' });
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { planId, description } = req.body || {};
    if (!planId || !String(planId).trim()) return res.status(400).json({ error: 'Plan ID is required' });
    if (!req.file) return res.status(400).json({ error: 'File (image or PDF) is required' });

    const created = await SitePlan.create({
      planId: String(planId).trim(),
      description: description ? String(description).trim() : '',
      filename: req.file.filename,
      mimeType: req.file.mimetype || 'image/jpeg',
    });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create site plan' });
  }
});

router.patch('/:id', upload.single('file'), async (req, res) => {
  try {
    const plan = await SitePlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Site plan not found' });

    if (req.body.planId !== undefined) plan.planId = String(req.body.planId).trim();
    if (req.body.description !== undefined) plan.description = String(req.body.description).trim();
    if (req.file) {
      try {
        await fs.unlink(path.join(UPLOAD_DIR, plan.filename));
      } catch (_) {}
      plan.filename = req.file.filename;
      plan.mimeType = req.file.mimetype || 'image/jpeg';
    }
    await plan.save();
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const plan = await SitePlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Site plan not found' });
    try {
      await fs.unlink(path.join(UPLOAD_DIR, plan.filename));
    } catch (_) {}
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
