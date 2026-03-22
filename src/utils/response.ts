import { Response } from "express";

/**
 * Standard utility to send successful JSON responses
 * 
 * @param res Express response object
 * @param statusCode HTTP status code
 * @param message Success message
 * @param data Optional payload data
 */
export const sendSuccess = (res: Response, statusCode: number, message: string, data: any = {}) => {
  return res.status(statusCode).json({
    message,
    ...data,
  });
};

/**
 * Convenience method for 200 OK responses
 */
export const ok = (res: Response, message: string, data?: any) => {
  return sendSuccess(res, 200, message, data);
};

/**
 * Convenience method for 201 Created responses
 */
export const created = (res: Response, message: string, data?: any) => {
  return sendSuccess(res, 201, message, data);
};
