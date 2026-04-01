import express from 'express';
import Role from '../models/Role.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { USER_ROLES } from '../models/User.js';

const router = express.Router();

const BUILTIN_ROLES = [
  { key: USER_ROLES.SYSTEM_ADMIN, label: 'System Admin', isSystem: true, active: true },
  { key: USER_ROLES.DEPARTMENT_ADMIN, label: 'Department Admin', isSystem: true, active: true },
  { key: USER_ROLES.DOCTOR, label: 'Doctor', isSystem: true, active: true },
  { key: USER_ROLES.NURSE, label: 'Nurse', isSystem: true, active: true },
  { key: USER_ROLES.WORKER, label: 'Worker', isSystem: true, active: true },
  { key: USER_ROLES.OTHER, label: 'Other', isSystem: true, active: true },
];

function sanitizeKey(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

router.get('/', authRequired, async (_req, res) => {
  try {
    const customRoles = await Role.find({ active: true }).sort({ label: 1 }).lean();
    const merged = [...BUILTIN_ROLES, ...customRoles.map((r) => ({
      _id: r._id,
      key: r.key,
      label: r.label,
      isSystem: false,
      active: r.active,
    }))];
    res.json(merged);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to load roles' });
  }
});

router.post('/', authRequired, requireRoles(USER_ROLES.SYSTEM_ADMIN), async (req, res) => {
  try {
    const { key, label } = req.body;
    const cleanLabel = String(label || '').trim();
    if (!cleanLabel) {
      return res.status(400).json({ error: 'label is required' });
    }
    const roleKey = sanitizeKey(key || cleanLabel);
    if (!roleKey) {
      return res.status(400).json({ error: 'Invalid role key' });
    }
    if (BUILTIN_ROLES.some((r) => r.key === roleKey)) {
      return res.status(400).json({ error: 'Cannot override built-in role' });
    }

    const created = await Role.create({ key: roleKey, label: cleanLabel });
    res.status(201).json(created);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Role key already exists' });
    }
    res.status(500).json({ error: 'Failed to create role' });
  }
});

router.patch('/:id', authRequired, requireRoles(USER_ROLES.SYSTEM_ADMIN), async (req, res) => {
  try {
    const { label, active } = req.body;
    const update = {};
    if (label !== undefined) {
      const cleanLabel = String(label).trim();
      if (!cleanLabel) return res.status(400).json({ error: 'label cannot be empty' });
      update.label = cleanLabel;
    }
    if (active !== undefined) update.active = Boolean(active);

    const updated = await Role.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Role not found' });
    res.json(updated);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.delete('/:id', authRequired, requireRoles(USER_ROLES.SYSTEM_ADMIN), async (req, res) => {
  try {
    const deleted = await Role.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Role not found' });
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;
