import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { registerSchema, loginSchema } from '../utils/validation';
import * as response from '../utils/response';

const setTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.registerUser(validatedData);
    setTokenCookie(res, refreshToken);
    return response.created(res, 'User created successfully', { 
      userId: user.id,
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.loginUser(validatedData);
    setTokenCookie(res, refreshToken);
    return response.ok(res, 'Login successful', { 
      userId: user.id, 
      accessToken 
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    return response.ok(res, 'Token refreshed', { accessToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await authService.logoutUser(refreshToken);
    }
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return response.ok(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};
