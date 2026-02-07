import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class AuditController {
  async getAllAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = '1',
        limit = '50',
        userId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        status: 'success',
        data: {
          logs,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const log = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!log) {
        throw new AppError('Audit log not found', 404);
      }

      res.json({
        status: 'success',
        data: { log },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogsByEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params;

      const logs = await prisma.auditLog.findMany({
        where: {
          entityType,
          entityId,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        status: 'success',
        data: {
          logs,
          total: logs.length,
          entityType,
          entityId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogsByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { page = '1', limit = '50' } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.auditLog.count({ where: { userId } }),
      ]);

      res.json({
        status: 'success',
        data: {
          user,
          logs,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [actionStats, entityStats, userStats, totalLogs] = await Promise.all([
        prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { id: true },
        }),
        prisma.auditLog.groupBy({
          by: ['entityType'],
          where,
          _count: { id: true },
        }),
        prisma.auditLog.groupBy({
          by: ['userId'],
          where,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
        prisma.auditLog.count({ where }),
      ]);

      // Get user details for top users
      const userIds = userStats.map((us: any) => us.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      });

    interface UserInfo {
      id: string;
      fullName: string;
      email: string;
      role: string;
    }

    const userMap = new Map<string, UserInfo>(users.map((u: UserInfo) => [u.id, u]));

    interface UserStat {
      userId: string;
      _count: {
        id: number;
      };
    }

    const topUsers = userStats.map((us: UserStat) => ({
      user: userMap.get(us.userId),
      activityCount: us._count.id,
    }));

    interface ActionStat {
      action: string;
      _count: {
        id: number;
      };
    }

    interface EntityStat {
      entityType: string;
      _count: {
        id: number;
      };
    }

    interface ActionBreakdown {
      action: string;
      count: number;
    }

    interface EntityBreakdown {
      entityType: string;
      count: number;
    }

    interface TopUser {
      user: UserInfo | undefined;
      activityCount: number;
    }

    interface AuditStatsData {
      totalLogs: number;
      actionBreakdown: ActionBreakdown[];
      entityBreakdown: EntityBreakdown[];
      topUsers: TopUser[];
    }

    res.json({
      status: 'success',
      data: {
        totalLogs,
        actionBreakdown: actionStats.map((as: ActionStat) => ({
        action: as.action,
        count: as._count.id,
        })),
        entityBreakdown: entityStats.map((es: EntityStat) => ({
        entityType: es.entityType,
        count: es._count.id,
        })),
        topUsers,
      } as AuditStatsData,
    });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuditController();
