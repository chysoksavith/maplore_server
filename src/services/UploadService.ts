import sharp from 'sharp';
import path from 'path';
import { randomUUID } from 'crypto';
import { IStorageProvider, IUploadResponse } from '../providers/storage';
import { LocalStorageProvider } from '../providers/LocalStorageProvider';
import { CloudinaryProvider } from '../providers/CloudinaryProvider';

export class UploadService {
  private provider: IStorageProvider;

  constructor() {
    const driver = process.env.STORAGE_DRIVER || 'local';
    this.provider = driver === 'cloudinary' ? new CloudinaryProvider() : new LocalStorageProvider();
  }

  async processAndUpload(
    file: Express.Multer.File,
    options?: { folder?: string; width?: number; height?: number }
  ): Promise<IUploadResponse> {
    const { folder, width, height } = options || {};

    const fileName = `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
    const tempPath = path.join(path.dirname(file.path), `processed_${fileName}`);

    // Processing with Sharp (Compression and Resizing)
    const pipeline = sharp(file.path);

    if (width || height) {
      pipeline.resize(width, height, { fit: 'inside', withoutEnlargement: true });
    }

    // Convert to webp if it's a large image, otherwise optimize original format
    await pipeline
      .toFormat('webp', { quality: 80 }) 
      .toFile(tempPath);

    // Prepare a mock multer file for the provider
    const processedFile: Express.Multer.File = {
      ...file,
      filename: fileName.replace(path.extname(fileName), '.webp'),
      path: tempPath,
      mimetype: 'image/webp',
    };

    const response = await this.provider.upload(processedFile, folder);
    
    // Final cleanup of the original temp file
    // fs-extra is used in providers for that usually, but let's be safe
    // The provider should handle its file cleanup but standardizing it...
    // Standardizing it:
    // ... we don't need the original anymore
    const fs = await import('fs-extra');
    if (await fs.default.pathExists(file.path)) {
      await fs.default.remove(file.path);
    }

    return response;
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    options?: { folder?: string; width?: number; height?: number }
  ): Promise<IUploadResponse[]> {
    return Promise.all(
      files.map((file) => this.processAndUpload(file, options))
    );
  }

  async delete(filename: string, folder?: string): Promise<void> {
    return this.provider.delete(filename, folder);
  }

  /**
   * Tries to delete an image by its URL.
   * Useful when updating an entity that already has an image.
   */
  async deleteByUrl(url?: string | null): Promise<void> {
    if (!url) return;

    try {
      if (process.env.STORAGE_DRIVER === 'cloudinary') {
        // Cloudinary: Extract publicId from URL: 
        // e.g., https://res.cloudinary.com/cloud/image/upload/v123/folder/filename.jpg
        const parts = url.split('/');
        const fileWithExt = parts[parts.length - 1];
        const folder = parts[parts.length - 2];
        const publicId = `${folder}/${fileWithExt.split('.')[0]}`;
        await this.delete(publicId);
      } else {
        // Local: Extract from URL:
        // e.g., http://localhost:3000/uploads/folder/filename.webp
        const parts = url.split('/uploads/');
        if (parts.length > 1) {
          const relativePath = parts[1];
          const fileName = path.basename(relativePath);
          const folder = path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath);
          await this.delete(fileName, folder);
        }
      }
    } catch (error) {
      console.error('Failed to delete old image:', error);
    }
  }
}

export const uploadService = new UploadService();
