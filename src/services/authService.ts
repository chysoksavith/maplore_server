import prisma from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { registerSchema, loginSchema, resetPasswordSchema } from "../utils/validation";
import { z } from "zod";
import { AppError } from "../utils/AppError";
import { sendEmail } from "./emailService";
import logger from "../utils/logger";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BCRYPT_ROUNDS = 12; // OWASP recommends ≥12
const OTP_TTL_MS = 10 * 60 * 1000;         // 10 minutes
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1  hour
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 7;
const OTP_MAX_FAILED_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 30 * 60 * 1000; // 30 minutes


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically-random OTP using crypto.randomInt so the
 * distribution is uniform and there is no Math.random() bias.
 */
const generateOtp = (): string =>
  crypto.randomInt(100_000, 999_999).toString();

const generateTokens = async (userId: number) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET as string,
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt },
  });

  return { accessToken, refreshToken };
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export const registerUser = async (
  userData: z.infer<typeof registerSchema>,
) => {
  const { email, name, password, roleId, type, isActive, avatar } = userData;

  // Case-insensitive duplicate-email check
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existingUser) {
    throw new AppError("Email already in use", 400);
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let finalRoleId = roleId;
  if (!finalRoleId) {
    const defaultRole = await prisma.role.findUnique({ where: { name: "USER" } });
    finalRoleId = defaultRole?.id;
  }

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      roleId: finalRoleId || null,
      type: type as any,
      isActive: isActive ?? true,
      avatar,
    },
  });

  const tokens = await generateTokens(user.id);
  return { user, ...tokens };
};

export const updateUserProfile = async (
  userId: number,
  profileData: { name?: string; password?: string; avatar?: string }
) => {
  const data: any = {};
  
  if (profileData.name) data.name = profileData.name;
  if (profileData.password) data.password = await bcrypt.hash(profileData.password, 10);
  if (profileData.avatar) data.avatar = profileData.avatar;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return user;
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export const loginUser = async (loginData: z.infer<typeof loginSchema>) => {
  const { email, password } = loginData;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    // Standard bcrypt dummy-hash to avoid timing leakage
    const dummyHash = "$2a$12$invalidhashpaddedjusttokeepbcryptconstanttime000000000";
    await bcrypt.compare(password, dummyHash);
    throw new AppError("Invalid credentials", 401);
  }

  // 1. Check if user is banned
  if (user.bannedAt) {
    throw new AppError(`Account banned: ${user.bannedReason || "No reason provided"}`, 403);
  }

  // 2. Check if user is active
  if (!user.isActive) {
    throw new AppError("User account is inactive. Please contact support.", 403);
  }

  // 3. Check if user is locked (Brute-force protection)
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(`Account is temporarily locked. Try again in ${minutesLeft} minutes.`, 429);
  }

  // 4. Constant-time comparison
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    // Increment failed-attempt counter
    const newAttempts = user.loginAttempts + 1;
    const updateData: any = { loginAttempts: newAttempts };

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCK_TIME_MS);
      logger.warn(`Account locked due to too many failed attempts: ${user.email}`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    throw new AppError("Invalid credentials", 401);
  }

  // 5. Success – Reset attempts, set lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const isOtpRequired = process.env.SEND_EMAIL_OTP === "true";

  if (isOtpRequired) {
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + OTP_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpires,
        otpAttempts: 0, // reset failed-attempt counter on new OTP issuance
      },
    });

    await sendEmail({
      to: user.email,
      subject: "Your Login Verification Code",
      text: `Your verification code is: ${otp}\n\nIt expires in 10 minutes. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111;">
          <h2 style="margin-top:0;">Login Verification</h2>
          <p>Use the code below to complete your sign-in. It is valid for <strong>10 minutes</strong>.</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 6px; margin: 24px 0;">
            ${otp}
          </div>
          <p style="color:#666; font-size:13px;">If you did not attempt to log in, you can safely ignore this email. Do <strong>not</strong> share this code with anyone.</p>
        </div>
      `,
    });

    return { otpRequired: true, email: user.email };
  }

  const tokens = await generateTokens(user.id);
  return { user, ...tokens };
};

// ---------------------------------------------------------------------------
// Verify OTP
// ---------------------------------------------------------------------------
export const verifyLoginOtp = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.otpCode || !user.otpExpires) {
    throw new AppError("Invalid or expired verification code", 401);
  }

  // Enforce expiry first to avoid leaking attempt information
  if (user.otpExpires < new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpires: null, otpAttempts: 0 },
    });
    throw new AppError("Verification code has expired. Please log in again to receive a new code.", 401);
  }

  // Throttle failed OTP attempts per-user (complements the IP-based rate limiter)
  const attempts = (user as any).otpAttempts ?? 0;
  if (attempts >= OTP_MAX_FAILED_ATTEMPTS) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpires: null, otpAttempts: 0 },
    });
    throw new AppError(
      "Too many failed verification attempts. Please log in again to request a new code.",
      429,
    );
  }

  // Constant-time string comparison to prevent timing attacks
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(otp),
    Buffer.from(user.otpCode),
  );

  if (!isMatch) {
    // Increment failed-attempt counter
    await prisma.user.update({
      where: { id: user.id },
      data: { otpAttempts: { increment: 1 } },
    });
    throw new AppError("Invalid or expired verification code", 401);
  }

  // Success – clear OTP fields atomically
  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: null, otpExpires: null, otpAttempts: 0 },
  });

  const tokens = await generateTokens(user.id);
  return { user, ...tokens };
};

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------
export const refreshAccessToken = async (token: string) => {
  const refreshTokenModel = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!refreshTokenModel) throw new AppError("Invalid refresh token", 401);

  if (refreshTokenModel.expiresAt < new Date()) {
    // Expired token – delete it and force re-login
    await prisma.refreshToken.delete({ where: { token } });
    throw new AppError("Refresh token has expired, please log in again", 401);
  }

  // Refresh token rotation: invalidate the old token and issue a new pair
  const newRefreshTokenStr = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { token } }),
    prisma.refreshToken.create({
      data: {
        token: newRefreshTokenStr,
        userId: refreshTokenModel.userId,
        expiresAt,
      },
    }),
  ]);

  const accessToken = jwt.sign(
    { userId: refreshTokenModel.userId },
    process.env.JWT_SECRET as string,
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  return { accessToken, newRefreshToken: newRefreshTokenStr };
};

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
export const logoutUser = async (token: string) => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------
export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success to prevent email-enumeration attacks.
  if (!user) return;

  // Check if an unexpired token already exists to prevent token flooding
  if (
    user.resetPasswordToken &&
    user.resetPasswordExpires &&
    user.resetPasswordExpires > new Date()
  ) {
    // Silently succeed so the user can retry after the window expires,
    // but we don't send a second email (prevents email-bombing).
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken: hashedToken, resetPasswordExpires },
  });

  const resetUrl = `${
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  }/reset-password/${resetToken}`;

  if (process.env.SEND_EMAIL_OTP !== "true") {
    // Development bypass: log the link but do NOT expose it in the API response
    logger.info(`[DEV] Password reset link for ${user.email}: ${resetUrl}`);
    return;
  }

  await sendEmail({
    to: user.email,
    subject: "Password Reset Request",
    text: `You requested a password reset. Use the link below (valid 1 hour):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111;">
        <h2 style="margin-top:0;">Password Reset</h2>
        <p>You requested a password reset. Click the button below to set a new password. The link is valid for <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="display:inline-block; padding:12px 28px; background:#1d4ed8; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
            Reset Password
          </a>
        </div>
        <p style="color:#666; font-size:13px;">If you did not request a password reset, you can safely ignore this email. Your password will <strong>not</strong> change.</p>
      </div>
    `,
  });
};

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------
export const resetPassword = async (
  token: string,
  passwordData: z.infer<typeof resetPasswordSchema>,
) => {
  // The bypass (email-based reset without token) is intentionally removed.
  // All resets must go through the secure token flow even in development –
  // the token is logged to the console via forgotPassword() in dev mode.
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await bcrypt.hash(passwordData.password, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  // Revoke all existing refresh tokens so every device must re-authenticate
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
};
