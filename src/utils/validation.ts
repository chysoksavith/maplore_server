import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared password rule – single source of truth to keep register & reset in sync
// ---------------------------------------------------------------------------
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters long') // guard against bcrypt DoS on very long passwords
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[\W_]/, 'Password must contain at least one special character');

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be at most 100 characters long')
    .trim(),
  password: passwordSchema,
  roleId: z.number().int().positive().optional(),
  type: z.enum(['BACKEND', 'FRONTEND']).optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Update profile
// ---------------------------------------------------------------------------
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be at most 100 characters long')
    .trim()
    .optional(),
  password: passwordSchema.optional(),
  avatar: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
});

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ---------------------------------------------------------------------------
// OTP verification
// ---------------------------------------------------------------------------
export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  // Digits only, exactly 6 characters
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});
