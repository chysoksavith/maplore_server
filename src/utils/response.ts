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

/**
 * Standard utility to send error JSON responses
 * 
 * @param res Express response object
 * @param statusCode HTTP status code
 * @param message Error message
 * @param errors Optional detailed validation errors
 */
export const sendError = (res: Response, statusCode: number, message: string, errors: any = null) => {
  const payload: any = { message };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

/**
 * Convenience method for 400 Bad Request
 */
export const badRequest = (res: Response, message: string, errors?: any) => {
  return sendError(res, 400, message, errors);
};

/**
 * Convenience method for 401 Unauthorized
 */
export const unauthorized = (res: Response, message: string) => {
  return sendError(res, 401, message);
};

/**
 * Convenience method for 403 Forbidden
 */
export const forbidden = (res: Response, message: string = "Forbidden") => {
  return sendError(res, 403, message);
};

/**
 * Convenience method for 404 Not Found
 */
export const notFound = (res: Response, message: string) => {
  return sendError(res, 404, message);
};

/**
 * Convenience method for 500 Internal Server Error
 */
export const serverError = (res: Response, message: string = "Something went wrong") => {
  return sendError(res, 500, message);
};
