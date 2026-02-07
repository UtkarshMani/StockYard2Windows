import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const permissionSchema = z.object({
  resource: z.enum([
    'inventory',
    'projects',
    'gatepass',
    'purchase_orders',
    'suppliers',
    'users',
    'analytics',
    'settings',
  ]),
  canView: z.boolean().default(false),
  canCreate: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
});

const bulkPermissionsSchema = z.array(permissionSchema);

export class PermissionController {
  async getUserPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      // Only admins or the user themselves can view permissions
      if (req.user?.role !== 'admin' && req.user?.id !== userId) {
        throw new AppError('Insufficient permissions', 403);
      }

      const permissions = await prisma.userPermission.findMany({
        where: { userId },
        orderBy: { resource: 'asc' },
      });

      res.json({
        status: 'success',
        data: { permissions },
      });
    } catch (error) {
      next(error);
    }
  }

  async setUserPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      // Only admins can set permissions
      if (req.user?.role !== 'admin') {
        throw new AppError('Only admins can manage permissions', 403);
      }

      const { userId } = req.params;
      const validatedData = bulkPermissionsSchema.parse(req.body);

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Delete existing permissions and create new ones
      await prisma.$transaction(async (tx) => {
        // Delete all existing permissions for this user
        await tx.userPermission.deleteMany({
          where: { userId },
        });

        // Create new permissions
        if (validatedData.length > 0) {
          await tx.userPermission.createMany({
            data: validatedData.map((perm) => ({
              userId,
              resource: perm.resource,
              canView: perm.canView,
              canCreate: perm.canCreate,
              canEdit: perm.canEdit,
              canDelete: perm.canDelete,
            })),
          });
        }
      });

      // Fetch updated permissions
      const permissions = await prisma.userPermission.findMany({
        where: { userId },
        orderBy: { resource: 'asc' },
      });

      res.json({
        status: 'success',
        data: { permissions },
      });
    } catch (error) {
      next(error);
    }
  }

  async getDefaultPermissions(_req: Request, res: Response, next: NextFunction) {
    try {
      // Return default permissions template for all resources
      const resources = [
        'inventory',
        'projects',
        'gatepass',
        'purchase_orders',
        'suppliers',
        'users',
        'analytics',
        'settings',
      ];

      const defaultPermissions = resources.map((resource) => ({
        resource,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      }));

      res.json({
        status: 'success',
        data: { permissions: defaultPermissions },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PermissionController();
