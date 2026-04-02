import express from 'express';
import * as authController from '../controllers/authController';
import {
  loginLimiter,
  otpLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from '../middleware/rateLimiter';

const router = express.Router();

// Public auth routes
router.post('/register',        authController.register);
router.post('/login',           loginLimiter,          authController.login);
router.post('/verify-otp',      otpLimiter,            authController.verifyOtp);
router.post('/resend-otp',      resendOtpLimiter,      authController.resendOtp);
router.post('/refresh',         authController.refresh);
router.post('/logout',          authController.logout);

// Password recovery
router.post('/forgot-password',          forgotPasswordLimiter,  authController.forgotPassword);
router.post('/reset-password/:token',    resetPasswordLimiter,   authController.resetPassword);

export default router;
