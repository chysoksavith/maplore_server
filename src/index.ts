import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { globalLimiter } from './middleware/rateLimiter';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import uploadRoutes from './routes/upload';
import { errorHandler } from './middleware/errorMiddleware';
import * as response from './utils/response';
import logger from './utils/logger';

const app: Express = express();

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));


// Trust proxy if you are behind a load balancer/reverse proxy
// app.set('trust proxy', 1);

app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req: Request, res: Response) => {
  return response.ok(res, 'Maplore API is running');
});

app.get('/api/health', (req: Request, res: Response) => {
  return response.ok(res, 'Maplore API is healthy and connected');
});

// auth routes
app.use('/api/auth', authRoutes);

// user routes
app.use('/api/users', userRoutes);

// role routes
app.use('/api/roles', roleRoutes);
app.use('/api', uploadRoutes);

// Serve uploads if local storage is used
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(errorHandler);

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;
