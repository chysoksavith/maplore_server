import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";
import { registerSchema, loginSchema } from "../utils/validation";
import * as response from "../utils/response";
import logger from "../utils/logger";

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    // Explicitly exclude sensitive fields to prevent privilege escalation during public signup
    const { roleId, type, isActive, ...publicData } = validatedData;
    const { user, accessToken, refreshToken } =
      await authService.registerUser(publicData);
    setAuthCookies(res, accessToken, refreshToken);
    logger.info(`New user registered: ${user.email}`);
    return response.created(res, "User created successfully", {
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin-only user creation: Allows specifying a roleId.
 * Needs to be protected by both 'protect' and 'canManage("User")' middleware.
 */
export const adminCreateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } =
      await authService.registerUser(validatedData);
    // We don't set cookie for the admin's session, we just return the new user info.
    return response.created(res, "User created by admin successfully", {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } =
      await authService.loginUser(validatedData);
    setAuthCookies(res, accessToken, refreshToken);
    logger.info(`User logged in: ${user.email}`);
    return response.ok(res, "Login successful", {
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return response.unauthorized(res, "No refresh token provided");
    }
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    logger.info(`Access token refreshed via /refresh`);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    return response.ok(res, "Token refreshed");
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await authService.logoutUser(refreshToken);
      logger.info('User logged out');
    }
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return response.ok(res, "Logged out successfully");
  } catch (error) {
    next(error);
  }
};
