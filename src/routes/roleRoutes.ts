import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { canCreate, canDelete, canRead, canUpdate } from '../middleware/authorize';
import * as roleController from '../controllers/roleController';

const router = express.Router();

// Require authentication for all role routes
router.use(protect);

// Permissions CRUD
router.get('/permissions', canRead('Permission'), roleController.getPermissions);
router.post('/permissions', canCreate('Permission'), roleController.createPermission);

// Roles CRUD
router.get('/', canRead('Role'), roleController.getRoles);
router.get('/:id', canRead('Role'), roleController.getRoleById);
router.post('/', canCreate('Role'), roleController.createRole);
router.put('/:id', canUpdate('Role'), roleController.updateRole);
router.delete('/:id', canDelete('Role'), roleController.deleteRole);

// User assignment
router.patch('/users/:userId/assign', canUpdate('Role'), roleController.assignRoleToUser);

export default router;
