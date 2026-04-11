import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
  updateProfileSchema,
} from "../utils/validation";
import * as response from "../utils/response";
import logger from "../utils/logger";
import { uploadService } from "../services/UploadService";
import * as userService from "../services/userService";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  clearAllAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../utils/authCookies";

// ---------------------------------------------------------------------------
// Register (public sign-up)
// ---------------------------------------------------------------------------
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    // Explicitly strip sensitive fields – privilege escalation prevention
    const { roleId, type, isActive, ...publicData } = validatedData;
    const { user, accessToken, refreshToken } =
      await authService.registerUser(publicData);

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    logger.info(`New user registered: ${user.email}`);
    return response.created(res, "User created successfully", {
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Admin-only user creation
// Must be protected by 'protect' + 'canManage("User")' middleware on the route.
// ---------------------------------------------------------------------------
export const adminCreateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    let avatarUrl = undefined;
    if (req.file) {
      const uploadRes = await uploadService.processAndUpload(req.file, {
        folder: 'avatars',
        width: 300,
        height: 300,
      });
      avatarUrl = uploadRes.url;
    }

    const { user } = await authService.registerUser({ ...validatedData, avatar: avatarUrl });
    // Do NOT issue tokens for the admin's session – only return the new user's info
    return response.created(res, "User created by admin successfully", {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        roleId: user.roleId,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Update profile (authenticated)
// ---------------------------------------------------------------------------
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) return response.unauthorized(res, "User not found in request");

    const validatedData = updateProfileSchema.parse(req.body);
    let avatarUrl = undefined;

    if (req.file) {
      // 1. Cleanup old avatar
      if (req.user.avatar) {
        await uploadService.deleteByUrl(req.user.avatar);
      }
      // 2. Upload new
      const uploadRes = await uploadService.processAndUpload(req.file, {
        folder: 'avatars',
        width: 300,
        height: 300,
      });
      avatarUrl = uploadRes.url;
    }

    const updatedUser = await userService.updateUser(req.user.id, {
      ...validatedData,
      avatar: avatarUrl,
    });

    return response.ok(res, "Profile updated successfully", {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phoneNumber: updatedUser.phoneNumber,
        gender: updatedUser.gender,
        avatar: updatedUser.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.loginUser(validatedData);

    if ("otpRequired" in result) {
      // Never echo back the full email – return it exactly as stored/normalised
      return response.ok(res, "Verification code sent to your email", {
        otpRequired: true,
        // Returning the email is acceptable here; the client needs it for the
        // next OTP submission. Masking (e.g. "j***@example.com") is optional UI polish.
        email: result.email,
      });
    }

    const { user, accessToken, refreshToken } = result;
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    return response.ok(res, "Login successful", {
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Verify OTP (login second step)
// ---------------------------------------------------------------------------
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const { user, accessToken, refreshToken } =
      await authService.verifyLoginOtp(email, otp);
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    return response.ok(res, "Verification successful", {
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = resendOtpSchema.parse(req.body);
    const result = await authService.resendLoginOtp(email);
    return response.ok(res, "If the account is eligible, a new verification code has been sent.", {
      otpRequired: true,
      email: result.email,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (!refreshToken) {
      return response.unauthorized(res, "No refresh token provided");
    }
    const { accessToken, newRefreshToken } =
      await authService.refreshAccessToken(refreshToken);
    // Rotate: replace old cookie with new one
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, newRefreshToken);
    logger.info(`Access token refreshed via /refresh`);
    return response.ok(res, "Token refreshed");
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (refreshToken) {
      await authService.logoutUser(refreshToken);
      logger.info('User logged out');
    }
    clearAllAuthCookies(res);
    return response.ok(res, "Logged out successfully");
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Always return the same message whether the email exists or not
    return response.ok(
      res,
      "If an account with that email exists, a password reset link has been sent.",
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.params.token as string;
    if (!token || token.length < 10) {
      return response.badRequest(res, "Invalid reset token");
    }
    const validatedData = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, validatedData);
    return response.ok(
      res,
      "Password has been reset successfully. Please log in with your new password.",
    );
  } catch (error) {
    next(error);
  }
};
