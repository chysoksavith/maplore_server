export interface IUploadResponse {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface IStorageProvider {
  upload(file: Express.Multer.File, folder?: string): Promise<IUploadResponse>;
  delete(filename: string, folder?: string): Promise<void>;
}
