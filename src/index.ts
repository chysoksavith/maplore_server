import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import { errorHandler } from './middleware/errorMiddleware';
import * as response from './utils/response';

dotenv.config();

const app: Express = express();

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // Default 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10), // limit each IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Specific limiter for login to prevent brute force
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_LIMIT_WINDOW_MS || "900000", 10), // Default 15 minutes
  max: parseInt(process.env.LOGIN_LIMIT_MAX || "10", 10), // limit each IP
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req: Request, res: Response) => {
  return response.ok(res, 'Maplore API is running');
});

app.get('/api/health', (req: Request, res: Response) => {
  return response.ok(res, 'Maplore API is healthy and connected');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);

app.use(errorHandler);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
