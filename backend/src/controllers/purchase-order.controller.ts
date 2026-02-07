import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional(),
  orderDate: z.string().datetime(),
  expectedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative().optional().default(0),
    totalPrice: z.number().nonnegative().optional().default(0),
  })).min(1, 'At least one item is required'),
  totalAmount: z.number().optional().default(0),
  taxAmount: z.number().optional().default(0),
});

const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  expectedDeliveryDate: z.string().datetime().optional(),
  actualDeliveryDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'approved', 'received', 'partial', 'cancelled']).optional(),
  notes: z.string().optional(),
});

const receivePurchaseOrderSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().uuid(),
    receivedQuantity: z.number().positive(),
  })),
  actualDeliveryDate: z.string().datetime().optional(),
});

export class PurchaseOrderController {
  async getAllPurchaseOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { supplierId, projectId, status, startDate, endDate } = req.query;

      const where: any = {};

      if (supplierId) {
        where.supplierId = supplierId as string;
      }

      if (projectId) {
        where.projectId = projectId as string;
      }

      if (status) {
        where.status = status as string;
      }

      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) {
          where.orderDate.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.orderDate.lte = new Date(endDate as string);
        }
      }

      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              supplierCode: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              projectCode: true,
            },
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  unitOfMeasurement: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        status: 'success',
        data: purchaseOrders,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPurchaseOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: true,
          project: true,
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!purchaseOrder) {
        throw new AppError('Purchase order not found', 404);
      }

      res.json({
        status: 'success',
        data: purchaseOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  async createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createPurchaseOrderSchema.parse(req.body);

      // Generate PO number
      const count = await prisma.purchaseOrder.count();
      const poNumber = `PO${String(count + 1).padStart(6, '0')}`;

      const purchaseOrder = await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: validatedData.supplierId,
            projectId: validatedData.projectId,
            orderDate: new Date(validatedData.orderDate),
            expectedDeliveryDate: validatedData.expectedDeliveryDate
              ? new Date(validatedData.expectedDeliveryDate)
              : undefined,
            totalAmount: validatedData.totalAmount,
            taxAmount: validatedData.taxAmount,
            notes: validatedData.notes,
            createdBy: req.user!.id,
            status: 'pending',
          },
          include: {
            supplier: true,
            project: true,
            items: {
              include: {
                item: true,
              },
            },
          },
        });

        // Create purchase order items
        for (const item of validatedData.items) {
          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: po.id,
              itemId: item.itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            },
          });
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'CREATE',
            entityType: 'PurchaseOrder',
            entityId: po.id,
            newValues: JSON.stringify(validatedData),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });

        return po;
      });

      res.status(201).json({
        status: 'success',
        message: 'Purchase order created successfully',
        data: purchaseOrder,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation failed: ' + JSON.stringify(error.errors), 400));
      }
      next(error);
    }
  }

  async updatePurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updatePurchaseOrderSchema.parse(req.body);

      const existingPO = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existingPO) {
        throw new AppError('Purchase order not found', 404);
      }

      // Prevent updates to received or cancelled orders
      if (['received', 'cancelled'].includes(existingPO.status)) {
        throw new AppError(
          `Cannot update purchase order with status: ${existingPO.status}`,
          400
        );
      }

      const purchaseOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.purchaseOrder.update({
          where: { id },
          data: {
            supplierId: validatedData.supplierId,
            projectId: validatedData.projectId,
            expectedDeliveryDate: validatedData.expectedDeliveryDate
              ? new Date(validatedData.expectedDeliveryDate)
              : undefined,
            actualDeliveryDate: validatedData.actualDeliveryDate
              ? new Date(validatedData.actualDeliveryDate)
              : undefined,
            status: validatedData.status,
            notes: validatedData.notes,
          },
          include: {
            supplier: true,
            project: true,
            items: {
              include: {
                item: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'UPDATE',
            entityType: 'PurchaseOrder',
            entityId: id,
            oldValues: JSON.stringify(existingPO),
            newValues: JSON.stringify(validatedData),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });

        return updated;
      });

      res.json({
        status: 'success',
        message: 'Purchase order updated successfully',
        data: purchaseOrder,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation failed: ' + JSON.stringify(error.errors), 400));
      }
      next(error);
    }
  }

  async receivePurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = receivePurchaseOrderSchema.parse(req.body);

      const existingPO = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingPO) {
        throw new AppError('Purchase order not found', 404);
      }

      if (existingPO.status === 'cancelled') {
        throw new AppError('Cannot receive cancelled purchase order', 400);
      }

      const purchaseOrder = await prisma.$transaction(async (tx) => {
        let allReceived = true;

        // Update received quantities and add to stock
        for (const receivedItem of validatedData.items) {
          const poItem = existingPO.items.find((i) => i.itemId === receivedItem.itemId);

          if (!poItem) {
            throw new AppError(`Item ${receivedItem.itemId} not found in purchase order`, 400);
          }

          const newReceivedQty = Number(poItem.receivedQuantity) + receivedItem.receivedQuantity;

          // Update purchase order item
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: {
              receivedQuantity: newReceivedQty,
            },
          });

          // Add to inventory
          await tx.item.update({
            where: { id: receivedItem.itemId },
            data: {
              currentQuantity: {
                increment: receivedItem.receivedQuantity,
              },
            },
          });

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              itemId: receivedItem.itemId,
              movementType: 'stock_in',
              quantity: receivedItem.receivedQuantity,
              referenceType: 'PurchaseOrder',
              referenceId: id,
              projectId: existingPO.projectId,
              notes: `Received from PO: ${existingPO.poNumber}`,
              performedBy: req.user!.id,
            },
          });

          // Check if all quantity has been received
          if (newReceivedQty < Number(poItem.quantity)) {
            allReceived = false;
          }
        }

        // Update PO status
        const status = allReceived ? 'received' : 'partial';
        const updated = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status,
            actualDeliveryDate: validatedData.actualDeliveryDate
              ? new Date(validatedData.actualDeliveryDate)
              : new Date(),
          },
          include: {
            supplier: true,
            project: true,
            items: {
              include: {
                item: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'RECEIVE',
            entityType: 'PurchaseOrder',
            entityId: id,
            newValues: JSON.stringify({ status, receivedItems: validatedData.items }),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });

        return updated;
      });

      res.json({
        status: 'success',
        message: 'Purchase order received successfully',
        data: purchaseOrder,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation failed: ' + JSON.stringify(error.errors), 400));
      }
      next(error);
    }
  }

  async deletePurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const existingPO = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingPO) {
        throw new AppError('Purchase order not found', 404);
      }

      // Prevent deletion if any items have been received
      const hasReceivedItems = existingPO.items.some(
        (item) => Number(item.receivedQuantity) > 0
      );

      if (hasReceivedItems) {
        throw new AppError(
          'Cannot delete purchase order with received items. Cancel instead.',
          400
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'DELETE',
            entityType: 'PurchaseOrder',
            entityId: id,
            oldValues: JSON.stringify(existingPO),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });

        await tx.purchaseOrder.delete({
          where: { id },
        });
      });

      res.json({
        status: 'success',
        message: 'Purchase order deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PurchaseOrderController();
