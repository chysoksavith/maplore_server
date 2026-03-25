import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  password: z.string().min(6),
  roleId: z.number().optional(),
  type: z.enum(['BACKEND', 'FRONTEND']).optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  avatar: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
