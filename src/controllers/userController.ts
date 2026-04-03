import { NextFunction, Request, Response } from 'express';
import * as response from '../utils/response';
import { listUsersQuerySchema } from '../utils/validation';
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
