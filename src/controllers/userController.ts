import { NextFunction, Request, Response } from 'express';
import * as response from '../utils/response';
import { listUsersQuerySchema, updateUserSchema } from '../utils/validation';
import * as userService from '../services/userService';

export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedQuery = listUsersQuerySchema.parse(req.query);
    const result = await userService.listUsers(validatedQuery);

    return response.ok(res, 'Users retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = parseInt(idParam, 10);
    if (isNaN(userId)) {
      return response.badRequest(res, 'Invalid user ID');
    }

    const validatedData = updateUserSchema.parse(req.body);
    const updatedUser = await userService.updateUser(userId, validatedData);

    return response.ok(res, 'User updated successfully', updatedUser);
  } catch (error) {
    next(error);
  }
};
