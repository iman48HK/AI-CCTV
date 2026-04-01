import jwt from 'jsonwebtoken';
import User, { USER_ROLES } from '../models/User.js';

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

export function limitToOwnDepartmentOrSystemAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  if (req.user.role === USER_ROLES.SYSTEM_ADMIN) {
    return next();
  }

  if (!req.user.departmentId) {
    return res.status(403).json({ error: 'No department associated with user' });
  }

  req.limitedDepartmentId = req.user.departmentId;
  return next();
}

