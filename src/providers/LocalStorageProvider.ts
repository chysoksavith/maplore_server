import fs from 'fs-extra';
import path from 'path';
import { IStorageProvider, IUploadResponse } from './storage';

export class LocalStorageProvider implements IStorageProvider {
  private uploadPath: string;
  private baseUrl: string;

  constructor() {
    this.uploadPath = path.resolve(process.cwd(), 'uploads');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, folder: string = ''): Promise<IUploadResponse> {
    const targetFolder = path.join(this.uploadPath, folder);
    
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const targetPath = path.join(targetFolder, file.filename);
    
    // Move from temp to target
    await fs.move(file.path, targetPath);

    return {
      filename: file.filename,
      url: `${this.baseUrl}/uploads/${folder ? folder + '/' : ''}${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(filename: string, folder: string = ''): Promise<void> {
    const filePath = path.join(this.uploadPath, folder, filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  }
}
