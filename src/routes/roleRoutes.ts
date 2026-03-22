import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { canManage } from '../middleware/authorize';
import * as roleController from '../controllers/roleController';

const router = express.Router();

// Require both authentication and authorization
// Only users with 'manage' 'Role' permission can access these routes (like SUPERADMIN or custom assigned)
router.use(protect);
router.use(canManage('Role'));

// Permissions CRUD
router.get('/permissions', roleController.getPermissions);
router.post('/permissions', roleController.createPermission);

// Roles CRUD
router.get('/', roleController.getRoles);
router.get('/:id', roleController.getRoleById);
router.post('/', roleController.createRole);
router.put('/:id', roleController.updateRole);
router.delete('/:id', roleController.deleteRole);

// User assignment
router.patch('/users/:userId/assign', roleController.assignRoleToUser);

export default router;
