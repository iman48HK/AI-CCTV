import express from 'express';
import User, { USER_ROLES } from '../models/User.js';
import Camera from '../models/Camera.js';
import Person from '../models/Person.js';
import Alert from '../models/Alert.js';
import { authRequired, limitToOwnDepartmentOrSystemAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired);

router.get('/stats', limitToOwnDepartmentOrSystemAdmin, async (req, res) => {
  try {
    const userFilter = {};
    if (req.limitedDepartmentId) {
      userFilter.department = req.limitedDepartmentId;
    }

    const [cctvsCount, visitorsCount, usersByRole, alertsByPeriod] = await Promise.all([
      Camera.countDocuments(),
      Person.countDocuments(),
      User.aggregate([
        { $match: userFilter },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]),
    ]);

    const roleLabels = {
      [USER_ROLES.SYSTEM_ADMIN]: 'System Admin',
      [USER_ROLES.DEPARTMENT_ADMIN]: 'Department Admin',
      [USER_ROLES.DOCTOR]: 'Doctor',
      [USER_ROLES.NURSE]: 'Nurse',
      [USER_ROLES.WORKER]: 'Worker',
      [USER_ROLES.OTHER]: 'Other',
    };

    const usersByRoleMap = usersByRole.reduce((acc, r) => {
      acc[roleLabels[r._id] || r._id] = r.count;
      return acc;
    }, {});

    const alertsByPeriodMap = alertsByPeriod.reduce((acc, p) => {
      acc[p._id] = p.count;
      return acc;
    }, {});

    res.json({
      cctvs: cctvsCount,
      visitors: visitorsCount,
      usersByRole: usersByRoleMap,
      alertsByPeriod: alertsByPeriodMap,
      alertsTotal: alertsByPeriod.reduce((s, p) => s + p.count, 0),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

export default router;
