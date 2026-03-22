import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import * as response from '../utils/response';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      
      // EXCLUDE PASSWORD from the user object for security
      const user = await prisma.user.findUnique({ 
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      action: true,
                      subject: true
                    }
                  }
                }
              }
            }
          },
          createdAt: true,
          updatedAt: true
          // password omitted
        }
      });

      if (!user) {
        return response.unauthorized(res, 'User not found');
      }

      req.user = user;
      return next();
    } catch (error) {
      return response.unauthorized(res, 'Not authorized, token failed');
    }
  }

  if (!token) {
    return response.unauthorized(res, 'Not authorized, no token');
  }
};
