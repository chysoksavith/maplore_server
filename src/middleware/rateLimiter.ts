import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // default 15 minutes
const maxGlobalRequests = parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '100', 10); // default 100

// ---------------------------------------------------------------------------
// Global rate limiter – applied to every route
// ---------------------------------------------------------------------------
export const globalLimiter = rateLimit({
  windowMs,
  max: maxGlobalRequests,
  message: {
    status: false,
    message: `Too many requests from this IP, please try again after ${windowMs / 60000} minutes`,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// ---------------------------------------------------------------------------
// Login / credential endpoints – brute-force protection
// Only FAILED login attempts count toward the limit (skipSuccessfulRequests).
// 5 attempts per 15-minute window is the safest default; override via env.
// ---------------------------------------------------------------------------
const maxLoginRequests = parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10);

export const loginLimiter = rateLimit({
  windowMs,
  max: maxLoginRequests,
  message: {
    status: false,
    message: `Too many login attempts, please try again after ${windowMs / 60000} minutes`,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Count only failed attempts so a legitimate user doesn't get locked out.
  skipSuccessfulRequests: true,
  validate: { xForwardedForHeader: false },
});

// ---------------------------------------------------------------------------
// OTP verification – tight window to prevent brute-forcing the 6-digit code
// 10 attempts per 15 minutes (a 6-digit space has 1 000 000 possibilities).
// ---------------------------------------------------------------------------
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_OTP_MAX || '10', 10),
  message: {
    status: false,
    message: 'Too many OTP attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { xForwardedForHeader: false },
});

export const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_RESEND_OTP_MAX || '5', 10),
  message: {
    status: false,
    message: 'Too many OTP resend requests, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// ---------------------------------------------------------------------------
// Forgot-password – throttle email-sending to prevent abuse / enumeration
// 3 per hour is the industry-standard default.
// ---------------------------------------------------------------------------
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_FORGOT_MAX || '3', 10),
  message: {
    status: false,
    message: 'Too many password reset requests, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// ---------------------------------------------------------------------------
// Reset-password token submission – prevent token-brute-forcing
// ---------------------------------------------------------------------------
export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_RESET_MAX || '5', 10),
  message: {
    status: false,
    message: 'Too many password reset attempts, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { xForwardedForHeader: false },
});
