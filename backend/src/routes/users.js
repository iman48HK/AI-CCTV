import express from 'express';
import bcrypt from 'bcryptjs';
import User, { USER_ROLES } from '../models/User.js';
import Role from '../models/Role.js';
import { authRequired, requireRoles, limitToOwnDepartmentOrSystemAdmin } from '../middleware/auth.js';

const router = express.Router();

async function isValidRole(role) {
  if (!role) return false;
  if (Object.values(USER_ROLES).includes(role)) return true;
  const custom = await Role.findOne({ key: role, active: true }).lean();
  return !!custom;
}

router.get(
  '/',
  authRequired,
  requireRoles(
    USER_ROLES.SYSTEM_ADMIN,
    USER_ROLES.DEPARTMENT_ADMIN,
    USER_ROLES.DOCTOR,
    USER_ROLES.NURSE,
    USER_ROLES.WORKER,
    USER_ROLES.OTHER
  ),
  limitToOwnDepartmentOrSystemAdmin,
  async (req, res) => {
    const filter = {};
    if (req.limitedDepartmentId) {
      filter.department = req.limitedDepartmentId;
    }
    const users = await User.find(filter)
      .populate('department', 'name')
      .sort({ fullName: 1 });
    res.json(users.map((u) => u.toSafeJSON()));
  }
);

router.post(
  '/',
  authRequired,
  requireRoles(USER_ROLES.SYSTEM_ADMIN, USER_ROLES.DEPARTMENT_ADMIN),
  limitToOwnDepartmentOrSystemAdmin,
  async (req, res) => {
    try {
      const { email, password, fullName, role, departmentId } = req.body;
      if (!email || !password || !fullName || !role) {
        return res
          .status(400)
          .json({ error: 'email, password, fullName, role are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      if (!(await isValidRole(role))) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      let deptForUser = departmentId || null;
      if (req.limitedDepartmentId) {
        deptForUser = req.limitedDepartmentId;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const created = await User.create({
        email,
        passwordHash,
        fullName,
        role,
        department: deptForUser,
      });
      return res.status(201).json(created.toSafeJSON());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.get('/me', authRequired, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user.toSafeJSON());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to load profile' });
  }
});

router.patch('/me', authRequired, async (req, res) => {
  try {
    const { fullName, avatarUrl } = req.body;
    const update = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (avatarUrl !== undefined) update.avatar = { url: avatarUrl };

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(updated.toSafeJSON());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/me/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(
  '/:id',
  authRequired,
  requireRoles(USER_ROLES.SYSTEM_ADMIN, USER_ROLES.DEPARTMENT_ADMIN),
  limitToOwnDepartmentOrSystemAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { fullName, role, departmentId } = req.body;
      const update = {};
      if (fullName !== undefined) update.fullName = fullName;
      if (role !== undefined) {
        if (!(await isValidRole(role))) {
          return res.status(400).json({ error: 'Invalid role' });
        }
        update.role = role;
      }
      if (departmentId !== undefined) {
        update.department = departmentId;
      }
      if (req.limitedDepartmentId) {
        update.department = req.limitedDepartmentId;
      }

      const updated = await User.findByIdAndUpdate(id, { $set: update }, { new: true });
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(updated.toSafeJSON());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post(
  '/:id/suspend',
  authRequired,
  requireRoles(USER_ROLES.SYSTEM_ADMIN, USER_ROLES.DEPARTMENT_ADMIN),
  limitToOwnDepartmentOrSystemAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await User.findByIdAndUpdate(
        id,
        { $set: { isSuspended: true } },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(updated.toSafeJSON());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post(
  '/:id/reactivate',
  authRequired,
  requireRoles(USER_ROLES.SYSTEM_ADMIN, USER_ROLES.DEPARTMENT_ADMIN),
  limitToOwnDepartmentOrSystemAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await User.findByIdAndUpdate(
        id,
        { $set: { isSuspended: false } },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(updated.toSafeJSON());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post(
  '/:id/reset-password',
  authRequired,
  requireRoles(USER_ROLES.SYSTEM_ADMIN, USER_ROLES.DEPARTMENT_ADMIN),
  limitToOwnDepartmentOrSystemAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ error: 'newPassword is required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      const updated = await User.findByIdAndUpdate(
        id,
        { $set: { passwordHash } },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ ok: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

