import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload';
import { uploadController } from '../controllers/UploadController';

const router = Router();

router.post('/upload', uploadMiddleware.single('image'), (req, res, next) => {
  uploadController.singleUpload(req, res, next);
});

router.post('/upload/multiple', uploadMiddleware.array('images', 10), (req, res, next) => {
  uploadController.multipleUpload(req, res, next);
});

router.patch('/users/:id/avatar', uploadMiddleware.single('avatar'), (req, res, next) => {
  uploadController.updateAvatar(req, res, next);
});

export default router;
