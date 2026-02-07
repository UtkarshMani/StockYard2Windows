import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  role: z.enum(['admin', 'warehouse_staff', 'gatepass_staff', 'project_manager']),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  role: z.enum(['admin', 'warehouse_staff', 'gatepass_staff', 'project_manager']).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export class UserController {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, isActive } = req.query;

      const where: any = {};
      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        status: 'success',
        data: { users, total: users.length },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          _count: {
            select: {
              managedProjects: true,
              createdPurchaseOrders: true,
              createdGatePasses: true,
              stockMovements: true,
            },
          },
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

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      // Only admins can create users - authorization should be in route
      const validatedData = createUserSchema.parse(req.body);

      // Check if user with same email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validatedData.password, 12);

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
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateUserSchema.parse(req.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new AppError('User not found', 404);
      }

      // If email is being updated, check for duplicates
      if (validatedData.email) {
        const duplicate = await prisma.user.findFirst({
          where: {
            email: validatedData.email,
            NOT: { id },
          },
        });

        if (duplicate) {
          throw new AppError('User with this email already exists', 400);
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: validatedData,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Prevent users from deleting themselves
      if (req.user?.id === id) {
        throw new AppError('Cannot delete your own account', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Instead of hard delete, deactivate the user
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        status: 'success',
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = changePasswordSchema.parse(req.body);

      // Users can only change their own password unless admin
      if (req.user?.role !== 'admin' && req.user?.id !== id) {
        throw new AppError('You can only change your own password', 403);
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        validatedData.currentPassword,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401);
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 12);

      await prisma.user.update({
        where: { id },
        data: { passwordHash: newPasswordHash },
      });

      res.json({
        status: 'success',
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      // Only admins can reset passwords
      if (req.user?.role !== 'admin') {
        throw new AppError('Only admins can reset passwords', 403);
      }

      const { id } = req.params;
      const validatedData = resetPasswordSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 12);

      await prisma.user.update({
        where: { id },
        data: { passwordHash: newPasswordHash },
      });

      res.json({
        status: 'success',
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async hardDeleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      // Only admins can hard delete
      if (req.user?.role !== 'admin') {
        throw new AppError('Only admins can delete users', 403);
      }

      const { id } = req.params;

      // Prevent users from deleting themselves
      if (req.user?.id === id) {
        throw new AppError('Cannot delete your own account', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Hard delete the user
      await prisma.user.delete({
        where: { id },
      });

      res.json({
        status: 'success',
        message: 'User permanently deleted',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
