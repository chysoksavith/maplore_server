import express from 'express';
import { protect, AuthRequest } from '../middleware/authMiddleware';
import { canManage } from '../middleware/authorize';
import * as response from '../utils/response';

const router = express.Router();

router.get('/profile', protect, (req: AuthRequest, res) => {
  return response.ok(res, 'User profile retrieved', { user: req.user });
});

// Example: Only SUPERADMIN or BACKEND_USER (who can manage 'Dashboard') will be able to access this endpoint
router.get('/dashboard-stats', protect, canManage('Dashboard'), (req: AuthRequest, res) => {
  return response.ok(res, 'Dashboard stats retrieved', { stats: { users: 150, items: 300 } });
});

export default router;
