import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as response from '../utils/response';

import logger from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return response.badRequest(res, 'Validation failed', err.issues);
  }

  if (err.message === 'Invalid credentials') {
    return response.unauthorized(res, err.message);
  }

  // Only log critical unhandled or 500 errors to file for debugging
  logger.error(err.message || 'Unhandled Server Error', { 
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });

  return response.serverError(res, 'Something went wrong');
};
