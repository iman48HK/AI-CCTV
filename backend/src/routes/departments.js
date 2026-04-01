import express from 'express';
import Department from '../models/Department.js';
import User, { USER_ROLES } from '../models/User.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.use(authRequired, requireRoles(USER_ROLES.SYSTEM_ADMIN));

router.get('/', async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  res.json(departments);
});

router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const created = await Department.create({ name, description });
    return res.status(201).json(created);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;
  try {
    const updated = await Department.findByIdAndUpdate(
      id,
      { $set: { name, description, isActive } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(updated);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Department.findByIdAndDelete(id);
    return res.status(204).end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/department-admins', async (req, res) => {
  const { id } = req.params;
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'email, password, fullName are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  try {
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await User.create({
      email,
      passwordHash,
      fullName,
      role: USER_ROLES.DEPARTMENT_ADMIN,
      department: department._id,
    });
    return res.status(201).json(admin.toSafeJSON());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

