import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import * as response from '../utils/response';
import * as authService from '../services/authService';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: any;
}

const getUserWithPermissions = async (userId: number) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
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
    }
  });
};

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = req.cookies.accessToken;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return response.unauthorized(res, 'Not authorized, no token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    
    // EXCLUDE PASSWORD from the user object for security
    const user = await getUserWithPermissions(decoded.userId);

    if (!user) {
      return response.unauthorized(res, 'User not found');
    }

    req.user = user;
    return next();
  } catch (error: any) {
    // If access token is expired, try to auto-refresh using the refresh token cookie
    if (error.name === 'TokenExpiredError') {
      const refreshToken = req.cookies.refreshToken;
      
      if (refreshToken) {
        try {
          logger.info('🔄 Access token expired. Attempting transparent auto-refresh...');
          
          const { accessToken: newAccessToken } = await authService.refreshAccessToken(refreshToken);
          
          // Set new access token cookie
          res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000, // 15 minutes
          });

          // Verify the newly generated token
          const decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET as string) as { userId: number };
          const user = await getUserWithPermissions(decoded.userId);

          if (user) {
            req.user = user;
            logger.info(`✅ Token auto-refreshed successfully for user: ${user.email}`);
            return next();
          }
        } catch (refreshError) {
          logger.warn('❌ Auto-refresh failed. Refresh token might be expired or invalid.');
        }
      }
    }
    
    return response.unauthorized(res, 'Not authorized, token failed');
  }
};
