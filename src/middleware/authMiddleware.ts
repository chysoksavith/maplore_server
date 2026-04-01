import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import * as response from '../utils/response';
import * as authService from '../services/authService';
import logger from '../utils/logger';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  isActive: boolean;
  bannedAt: Date | null;
  role: {
    name: string;
    permissions: { permission: { action: string; subject: string } }[];
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// ---------------------------------------------------------------------------
// Helper – fetch user with role & permissions (no password)
// ---------------------------------------------------------------------------
const getUserWithPermissions = async (userId: number): Promise<AuthenticatedUser | null> => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      isActive: true,
      bannedAt: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: {
          name: true,
          permissions: {
            select: {
              permission: {
                select: {
                  action: true,
                  subject: true,
                },
              },
            },
          },
        },
      },
    },
  }) as Promise<AuthenticatedUser | null>;
};

// ---------------------------------------------------------------------------
// protect middleware
// ---------------------------------------------------------------------------
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

    if (!user.isActive) {
      return response.forbidden(res, 'User account is inactive. Please contact support.');
    }

    if (user.bannedAt) {
      return response.forbidden(res, 'User account is banned.');
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

          const { accessToken: newAccessToken, newRefreshToken } =
            await authService.refreshAccessToken(refreshToken);

          // Rotate cookies
          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 minutes
          });
          res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/auth',
          });

          // Verify the newly generated token
          const newDecoded = jwt.verify(newAccessToken, process.env.JWT_SECRET as string) as { userId: number };
          const refreshedUser = await getUserWithPermissions(newDecoded.userId);

          if (refreshedUser) {
            req.user = refreshedUser;
            logger.info(`✅ Token auto-refreshed successfully for user: ${refreshedUser.email}`);
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
