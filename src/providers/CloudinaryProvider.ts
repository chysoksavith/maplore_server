import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs-extra';
import { IStorageProvider, IUploadResponse } from './storage';

export class CloudinaryProvider implements IStorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(file: Express.Multer.File, folder: string = 'uploads'): Promise<IUploadResponse> {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder || 'uploads',
      resource_type: 'auto',
    });

    // Cleanup local temp file
    if (await fs.pathExists(file.path)) {
      await fs.remove(file.path);
    }

    return {
      filename: result.public_id,
      url: result.secure_url,
      size: result.bytes,
      mimeType: result.format, // Note: This might not be exact for all types
    };
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
