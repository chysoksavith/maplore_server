import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/UploadService';
import prisma from '../config/db';

export class UploadController {
  async singleUpload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { folder, width, height } = req.body;
      const response = await uploadService.processAndUpload(req.file, {
        folder: typeof folder === 'string' ? folder : undefined,
        width: width ? parseInt(width as string) : undefined,
        height: height ? parseInt(height as string) : undefined,
      });

      return res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async multipleUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const { folder, width, height } = req.body;
      const response = await uploadService.uploadMultiple(files, {
        folder: typeof folder === 'string' ? folder : undefined,
        width: width ? parseInt(width as string) : undefined,
        height: height ? parseInt(height as string) : undefined,
      });

      return res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = Number.parseInt(rawId, 10);

      if (!Number.isInteger(userId)) {
        return res.status(400).json({ error: 'Invalid user id' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No image provided for avatar' });
      }

      // 1. Get current user's avatar
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // 2. Upload new avatar
      const response = await uploadService.processAndUpload(req.file, {
        folder: 'avatars',
        width: 300,
        height: 300,
      });

      // 3. Update database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatar: response.url },
      });

      // 4. Cleanup old avatar if possible (bonus feature)
      if (user.avatar) {
        await uploadService.deleteByUrl(user.avatar);
      }

      return res.status(200).json({
        message: 'Avatar updated successfully',
        avatar: updatedUser.avatar,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
