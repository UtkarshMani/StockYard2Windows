import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { Prisma } from '@prisma/client';

const stockInSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  unitCost: z.number().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const stockOutSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  projectId: z.string().uuid(),
  locationFrom: z.string().optional(),
  notes: z.string().optional(),
});

const adjustmentSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number(),
  reason: z.string(),
  notes: z.string().optional(),
});

export class StockController {
  async stockIn(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = stockInSchema.parse(req.body);

      const item = await prisma.item.findUnique({
        where: { id: validatedData.itemId },
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Use transaction to ensure data consistency
      interface StockInTransactionResult {
        movement: any;
        updatedItem: any;
      }

      interface StockMovementCreateData {
        itemId: string;
        movementType: string;
        quantity: number;
        unitCost?: number;
        referenceType?: string;
        referenceId?: string;
        locationTo?: string;
        notes?: string;
        performedBy: string;
      }

      interface StockMovementInclude {
        item: true;
        performer: {
          select: { fullName: true; email: true };
        };
      }

      interface ItemUpdateData {
        currentQuantity: {
          increment: number;
        };
      }

      interface AuditLogCreateData {
        userId: string;
        action: string;
        entityType: string;
        entityId: string;
        newValues: string;
        ipAddress: string | undefined;
        userAgent: string | undefined;
      }

      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<StockInTransactionResult> => {
        // Create stock movement record
        const movement = await tx.stockMovement.create({
          data: {
        itemId: validatedData.itemId,
        movementType: 'stock_in',
        quantity: validatedData.quantity,
        unitCost: validatedData.unitCost,
        referenceType: validatedData.referenceType,
        referenceId: validatedData.referenceId,
        locationTo: validatedData.location,
        notes: validatedData.notes,
        performedBy: req.user!.id,
          } as StockMovementCreateData,
          include: {
        item: true,
        performer: {
          select: { fullName: true, email: true },
        },
          } as StockMovementInclude,
        });

        // Update item quantity
        const updatedItem = await tx.item.update({
          where: { id: validatedData.itemId },
          data: {
        currentQuantity: {
          increment: validatedData.quantity,
        },
          } as ItemUpdateData,
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
        userId: req.user!.id,
        action: 'STOCK_IN',
        entityType: 'StockMovement',
        entityId: movement.id,
        newValues: JSON.stringify({
          itemId: validatedData.itemId,
          quantity: validatedData.quantity,
          newQuantity: updatedItem.currentQuantity.toString(),
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
          } as AuditLogCreateData,
        });

        return { movement, updatedItem };
      });

      res.status(201).json({
        status: 'success',
        message: 'Stock added successfully',
        data: {
          movement: result.movement,
          currentQuantity: result.updatedItem.currentQuantity.toString(),
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

  async stockOut(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = stockOutSchema.parse(req.body);

      const item = await prisma.item.findUnique({
        where: { id: validatedData.itemId },
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Check if sufficient stock is available
      if (item.currentQuantity.lt(validatedData.quantity)) {
        throw new AppError('Insufficient stock available', 400);
      }

      const project = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Use transaction
      interface StockOutTransactionResult {
        movement: any;
        updatedItem: any;
      }

      interface StockOutMovementCreateData {
        itemId: string;
        movementType: string;
        quantity: number;
        unitCost: any;
        projectId: string;
        locationFrom?: string;
        notes?: string;
        performedBy: string;
      }

      interface StockOutMovementInclude {
        item: true;
        project: true;
        performer: {
          select: { fullName: true; email: true };
        };
      }

      interface ItemUpdateDataStockOut {
        currentQuantity: {
          decrement: number;
        };
      }

      interface AuditLogCreateDataStockOut {
        userId: string;
        action: string;
        entityType: string;
        entityId: string;
        newValues: string;
        ipAddress: string | undefined;
        userAgent: string | undefined;
      }

      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<StockOutTransactionResult> => {
        // Create stock movement record
        const movement = await tx.stockMovement.create({
          data: {
        itemId: validatedData.itemId,
        movementType: 'stock_out',
        quantity: validatedData.quantity,
        unitCost: item.unitCost,
        projectId: validatedData.projectId,
        locationFrom: validatedData.locationFrom,
        notes: validatedData.notes,
        performedBy: req.user!.id,
          } as StockOutMovementCreateData,
          include: {
        item: true,
        project: true,
        performer: {
          select: { fullName: true, email: true },
        },
          } as StockOutMovementInclude,
        });

        // Update item quantity
        const updatedItem = await tx.item.update({
          where: { id: validatedData.itemId },
          data: {
        currentQuantity: {
          decrement: validatedData.quantity,
        },
          } as ItemUpdateDataStockOut,
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
        userId: req.user!.id,
        action: 'STOCK_OUT',
        entityType: 'StockMovement',
        entityId: movement.id,
        newValues: JSON.stringify({
          itemId: validatedData.itemId,
          projectId: validatedData.projectId,
          quantity: validatedData.quantity,
          newQuantity: updatedItem.currentQuantity.toString(),
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
          } as AuditLogCreateDataStockOut,
        });

        return { movement, updatedItem };
      });

      res.status(201).json({
        status: 'success',
        message: 'Stock removed successfully',
        data: {
          movement: result.movement,
          currentQuantity: result.updatedItem.currentQuantity.toString(),
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

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = adjustmentSchema.parse(req.body);

      const item = await prisma.item.findUnique({
        where: { id: validatedData.itemId },
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      interface StockAdjustmentTransactionResult {
        movement: any;
        updatedItem: any;
      }

      interface StockAdjustmentMovementCreateData {
        itemId: string;
        movementType: string;
        quantity: number;
        notes: string;
        performedBy: string;
      }

      interface ItemUpdateDataAdjustment {
        currentQuantity: {
          increment: number;
        };
      }

      interface AuditLogCreateDataAdjustment {
        userId: string;
        action: string;
        entityType: string;
        entityId: string;
        oldValues: string;
        newValues: string;
        ipAddress: string | undefined;
        userAgent: string | undefined;
      }

      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<StockAdjustmentTransactionResult> => {
        const movement = await tx.stockMovement.create({
          data: {
        itemId: validatedData.itemId,
        movementType: 'adjustment',
        quantity: Math.abs(validatedData.quantity),
        notes: `${validatedData.reason}. ${validatedData.notes || ''}`,
        performedBy: req.user!.id,
          } as StockAdjustmentMovementCreateData,
        });

        const updatedItem = await tx.item.update({
          where: { id: validatedData.itemId },
          data: {
        currentQuantity: {
          increment: validatedData.quantity,
        },
          } as ItemUpdateDataAdjustment,
        });

        await tx.auditLog.create({
          data: {
        userId: req.user!.id,
        action: 'STOCK_ADJUSTMENT',
        entityType: 'StockMovement',
        entityId: movement.id,
        oldValues: JSON.stringify({ quantity: item.currentQuantity.toString() }),
        newValues: JSON.stringify({
          quantity: updatedItem.currentQuantity.toString(),
          adjustment: validatedData.quantity,
          reason: validatedData.reason,
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
          } as AuditLogCreateDataAdjustment,
        });

        return { movement, updatedItem };
      });

      res.status(201).json({
        status: 'success',
        message: 'Stock adjusted successfully',
        data: {
          movement: result.movement,
          currentQuantity: result.updatedItem.currentQuantity.toString(),
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

  async getStockMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = '1',
        limit = '50',
        itemId,
        projectId,
        movementType,
        startDate,
        endDate,
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      if (itemId) where.itemId = itemId;
      if (projectId) where.projectId = projectId;
      if (movementType) where.movementType = movementType;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            item: {
              select: { name: true, barcode: true, unitOfMeasurement: true },
            },
            project: {
              select: { name: true, projectCode: true },
            },
            performer: {
              select: { fullName: true, email: true },
            },
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.stockMovement.count({ where }),
      ]);

      res.json({
        status: 'success',
        data: {
          movements,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / take),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new StockController();
