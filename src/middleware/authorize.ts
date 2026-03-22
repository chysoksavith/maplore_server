import { Response, NextFunction } from 'express';
import { defineAbilityFor } from '../config/ability';
import { AuthRequest } from './authMiddleware';
import * as response from '../utils/response';
import { ForbiddenError } from '@casl/ability';

export const authorize = (action: string, subject: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return response.unauthorized(res, 'User not authenticated');
      }

      // Validate that role exists on user object
      if (!req.user.role) {
        return response.forbidden(res, 'User role is not defined');
      }

      const ability = defineAbilityFor(req.user);
      
      // This will throw a ForbiddenError if the action is not allowed
      ForbiddenError.from(ability).throwUnlessCan(action, subject);
      
      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return response.forbidden(res, 'You do not have permission to perform this action');
      }
      return response.serverError(res, 'Authorization error occurred');
    }
  };
};

// --- Semantic Helpers for Routes ---
export const canRead = (subject: string) => authorize('read', subject);
export const canCreate = (subject: string) => authorize('create', subject);
export const canUpdate = (subject: string) => authorize('update', subject);
export const canDelete = (subject: string) => authorize('delete', subject);
export const canManage = (subject: string) => authorize('manage', subject);
