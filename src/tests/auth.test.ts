import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../index';
import { prismaMock } from './setup';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';

jest.mock('../config/db', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

jest.mock('../services/emailService', () => ({
  sendEmail: (jest.fn() as any).mockResolvedValue({ messageId: 'mock-id' }),
}));

describe('Authentication Endpoints', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test Member',
  };

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      // Mock findUnique to return null (user doesn't exist)
      prismaMock.user.findUnique.mockResolvedValue(null);
      
      // Mock role lookup
      prismaMock.role.findUnique.mockResolvedValue({ id: 1, name: 'USER' } as any);
      
      // Mock user creation
      prismaMock.user.create.mockResolvedValue({
        id: 1,
        email: testUser.email,
        name: testUser.name,
        roleId: 1,
      } as any);

      // Mock refresh token creation
      prismaMock.refreshToken.create.mockResolvedValue({ id: 1 } as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(1);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should fail if email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, email: testUser.email } as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/already/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login and return tokens when OTP is disabled', async () => {
      // Mock process.env
      process.env.SEND_EMAIL_OTP = 'false';

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: testUser.email,
        password: await bcrypt.hash(testUser.password, 2), // Low rounds for speed
      } as any);

      // Mock refresh token
      prismaMock.refreshToken.create.mockResolvedValue({ id: 1 } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.userId).toBe(1);
    });

    it('should prompt for OTP if enabled', async () => {
      process.env.SEND_EMAIL_OTP = 'true';

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: testUser.email,
        password: await bcrypt.hash(testUser.password, 2),
      } as any);

      prismaMock.user.update.mockResolvedValue({ id: 1 } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(200);
      expect(response.body.otpRequired).toBe(true);
      expect(response.body.email).toBe(testUser.email);
    });

    it('should fail with invalid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/invalid/i);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify OTP correctly', async () => {
      const otpCode = '123456';
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: testUser.email,
        otpCode: otpCode,
        otpExpires: new Date(Date.now() + 600000),
      } as any);

      prismaMock.user.update.mockResolvedValue({ id: 1 } as any);
      prismaMock.refreshToken.create.mockResolvedValue({ id: 1 } as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testUser.email, otp: otpCode });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.userId).toBe(1);
    });

    it('should fail with invalid OTP', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: testUser.email,
        otpCode: '123456',
        otpExpires: new Date(Date.now() + 600000),
      } as any);

      prismaMock.user.update.mockResolvedValue({ id: 1 } as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testUser.email, otp: '654321' });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/invalid/i);
    });
  });
});
