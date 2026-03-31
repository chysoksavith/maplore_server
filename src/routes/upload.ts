import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload';
import { uploadController } from '../controllers/UploadController';
import { protect } from '../middleware/authMiddleware';
import { canManage } from '../middleware/authorize';

const router = Router();

router.post('/upload', uploadMiddleware.single('image'), (req, res, next) => {
  uploadController.singleUpload(req, res, next);
});

router.post('/upload/multiple', uploadMiddleware.array('images', 10), (req, res, next) => {
  uploadController.multipleUpload(req, res, next);
});

router.patch('/users/:id/avatar', protect, canManage('User'), uploadMiddleware.single('avatar'), (req, res, next) => {
  uploadController.updateAvatar(req, res, next);
});

export default router;
