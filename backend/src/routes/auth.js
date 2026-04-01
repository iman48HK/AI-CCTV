import '../loadEnv.js';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { USER_ROLES } from '../models/User.js';

const router = express.Router();

function loginErrorResponse(res, err) {
  // eslint-disable-next-line no-console
  console.error('[auth/login]', err);
  const showDetail =
    process.env.NODE_ENV !== 'production' || process.env.AUTH_LOGIN_DEBUG === '1';
  const payload = { error: 'Internal server error' };
  if (showDetail && err && typeof err === 'object' && err.message) {
    payload.detail = err.message;
  }
  return res.status(500).json(payload);
}

router.post('/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    const hash = user.passwordHash;
    if (typeof hash !== 'string' || hash.length < 20) {
      // eslint-disable-next-line no-console
      console.error('[auth/login] user has invalid passwordHash', user._id);
      return res.status(500).json({ error: 'Account data error' });
    }

    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(String(password), hash);
    } catch (bcryptErr) {
      // eslint-disable-next-line no-console
      console.error('[auth/login] bcrypt.compare failed', bcryptErr);
      return res.status(500).json({ error: 'Account data error' });
    }

    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // eslint-disable-next-line no-console
      console.error('JWT_SECRET is missing at login time');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const roleStr =
      typeof user.role === 'string' ? user.role : String(user.role ?? '');
    const deptId =
      user.department != null ? String(user.department) : null;

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: roleStr,
        departmentId: deptId,
      },
      secret,
      { expiresIn: '12h' }
    );

    let safeUser;
    try {
      safeUser = user.toSafeJSON();
    } catch (serializeErr) {
      return loginErrorResponse(res, serializeErr);
    }

    return res.json({ token, user: safeUser });
  } catch (err) {
    return loginErrorResponse(res, err);
  }
});

router.post('/bootstrap-system-admin', async (req, res) => {
  try {
    const count = await User.countDocuments({ role: USER_ROLES.SYSTEM_ADMIN });
    if (count > 0) {
      return res.status(400).json({ error: 'System admin already exists' });
    }

    const { email, password: rawPassword, fullName } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }
    if (email !== 'sysadmin@abc.com') {
      return res.status(400).json({ error: 'System admin email must be sysadmin@abc.com' });
    }
    const password = rawPassword || '123456';
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await User.create({
      email,
      passwordHash,
      fullName: fullName || 'System Admin',
      role: USER_ROLES.SYSTEM_ADMIN,
    });

    return res.status(201).json(admin.toSafeJSON());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

