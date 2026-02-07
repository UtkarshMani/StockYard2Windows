import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import logger from '../utils/logger';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(['admin', 'warehouse_staff', 'gatepass_staff', 'project_manager']),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        throw new AppError('User already exists', 400);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validatedData.password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: validatedData.email,
          passwordHash,
          fullName: validatedData.fullName,
          role: validatedData.role,
          phone: validatedData.phone,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          createdAt: true,
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTERED',
          entityType: 'User',
          entityId: user.id,
          newValues: JSON.stringify({ email: user.email, role: user.role }),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      logger.info(`New user registered: ${user.email}`);

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: { user },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      if (!user.isActive) {
        throw new AppError('Account is inactive', 403);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        validatedData.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // Generate tokens
      const jwtSecret = process.env.JWT_SECRET;
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

      if (!jwtSecret || !jwtRefreshSecret) {
        throw new AppError('JWT secrets not configured', 500);
      }

      const accessTokenOptions = {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      } as SignOptions;

      const refreshTokenOptions = {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      } as SignOptions;

      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        jwtSecret,
        accessTokenOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        jwtRefreshSecret,
        refreshTokenOptions
      );

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          entityType: 'User',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      logger.info(`User logged in: ${user.email}`);

      res.json({
        status: 'success',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
      }

      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtRefreshSecret || !jwtSecret) {
        throw new AppError('JWT secrets not configured', 500);
      }

      const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401);
      }

      const accessTokenOptions = {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      } as SignOptions;

      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        jwtSecret,
        accessTokenOptions
      );

      res.json({
        status: 'success',
        data: { accessToken },
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        next(new AppError('Invalid or expired refresh token', 401));
      } else {
        next(error);
      }
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'USER_LOGOUT',
            entityType: 'User',
            entityId: req.user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });

        logger.info(`User logged out: ${req.user.email}`);
      }

      res.json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
