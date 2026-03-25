import express from 'express';
import * as authController from '../controllers/authController';
import { uploadMiddleware } from '../middleware/upload';

const router = express.Router();

router.post('/register', uploadMiddleware.single('avatar'), authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
