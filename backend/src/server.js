import './loadEnv.js';
import express from 'express';
import 'express-async-errors';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import departmentRoutes from './routes/departments.js';
import userRoutes from './routes/users.js';
import peopleRoutes from './routes/people.js';
import camerasRoutes from './routes/cameras.js';
import recognizeRoutes from './routes/recognize.js';
import comprefaceSyncRoutes from './routes/compreface-sync.js';
import sitePlansRoutes from './routes/site-plans.js';
import streamRoutes from './routes/stream.js';
import alertsRoutes from './routes/alerts.js';
import dashboardRoutes from './routes/dashboard.js';
import rolesRoutes from './routes/roles.js';
import User, { USER_ROLES } from './models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsPath = path.join(__dirname, 'uploads');

const app = express();

const corsDevOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
const corsExtraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const corsAllowHttps =
  process.env.CORS_ALLOW_HTTPS === '1' || process.env.CORS_ALLOW_HTTPS === 'true';

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsDevOrigins.includes(origin)) return callback(null, true);
      if (corsExtraOrigins.includes(origin)) return callback(null, true);
      if (corsAllowHttps) {
        try {
          if (new URL(origin).protocol === 'https:') return callback(null, true);
        } catch {
          /* ignore */
        }
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '16mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/departments', departmentRoutes);
app.use('/users', userRoutes);
app.use('/people', peopleRoutes);
app.use('/cameras', camerasRoutes);
app.use('/recognize', recognizeRoutes);
app.use('/compreface', comprefaceSyncRoutes);
app.use('/site-plans', sitePlansRoutes);
app.use('/stream', streamRoutes);
app.use('/alerts', alertsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/roles', rolesRoutes);
app.use('/uploads', express.static(uploadsPath));

const port = process.env.PORT || 4000;

async function start() {
  try {
    if (!process.env.JWT_SECRET) {
      // eslint-disable-next-line no-console
      console.error(
        'FATAL: JWT_SECRET is not set. Add JWT_SECRET to backend/.env (see .env.example).'
      );
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kwh_face_app'
    await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10_000,
    });
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB');

    const adminCount = await User.countDocuments({ role: USER_ROLES.SYSTEM_ADMIN });
    if (adminCount === 0) {
      const passwordHash = await bcrypt.hash('123456', 10);
      await User.create({
        email: 'sysadmin@abc.com',
        passwordHash,
        fullName: 'System Admin',
        role: USER_ROLES.SYSTEM_ADMIN,
      });
      // eslint-disable-next-line no-console
      console.log('Created sysadmin@abc.com (password: 123456)');
    }

    app.use((err, req, res, next) => {
      if (res.headersSent) return next(err);
      // eslint-disable-next-line no-console
      console.error('[express]', err);
      const status = err.status || err.statusCode || 500;
      const showDetail =
        process.env.NODE_ENV !== 'production' || process.env.AUTH_LOGIN_DEBUG === '1';
      res.status(status).json({
        error:
          status >= 500
            ? 'Internal server error'
            : err.message || 'Error',
        ...(showDetail && status >= 500 && { detail: err.message }),
      });
    });

    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend listening on http://localhost:${port}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

