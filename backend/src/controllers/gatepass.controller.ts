import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const createGatePassSchema = z.object({
  projectId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  size: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  description: z.string().optional(),
  gatePassDate: z.string().datetime(),
});

const createBulkGatePassSchema = z.object({
  projectId: z.string().uuid(),
  gatePassDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    size: z.string().optional(),
    totalPrice: z.number().nonnegative(),
  })).min(1, 'At least one item is required'),
  subtotal: z.number(),
  taxAmount: z.number().default(0),
  discountAmount: z.number().default(0),
  totalAmount: z.number(),
  notes: z.string().optional(),
});

const updateGatePassSchema = z.object({
  projectId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
  quantity: z.number().positive().optional(),
  size: z.string().optional(),
  unitPrice: z.number().nonnegative().optional(),
  description: z.string().optional(),
  gatePassDate: z.string().datetime().optional(),
});

export class GatePassController {
  async getAllGatePasses(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, itemId, startDate, endDate, status, paymentStatus } = req.query;

      const where: any = {};
      if (projectId) where.projectId = projectId;
      
      if (status) where.status = status;
      
      if (startDate || endDate) {
        where.gatePassDate = {};
        if (startDate) where.gatePassDate.gte = new Date(startDate as string);
        if (endDate) where.gatePassDate.lte = new Date(endDate as string);
      }

      const gatePasses = await prisma.gatePass.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              projectCode: true,
              siteAddress: true,
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
          creator: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { gatePassDate: 'desc' },
      });

      // Transform gatePasses to match frontend expectations
      const transformedGatePasses = gatePasses.map(gatePass => ({
        ...gatePass,
        paymentStatus: gatePass.status, // Map status to paymentStatus for frontend
      }));

      const totalAmount = gatePasses.reduce((sum, gatePass) => sum + Number(gatePass.totalAmount), 0);

      res.json({
        status: 'success',
        data: { 
          gatePasses: transformedGatePasses, 
          total: gatePasses.length,
          totalAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getGatePassById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const gatePass = await prisma.gatePass.findUnique({
        where: { id },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              projectCode: true,
              siteAddress: true,
              projectManager: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          items: {
            include: {
              item: true,
            },
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      if (!gatePass) {
        throw new AppError('GatePass record not found', 404);
      }

      res.json({
        status: 'success',
        data: { gatePass },
      });
    } catch (error) {
      next(error);
    }
  }

  async createGatePass(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createGatePassSchema.parse(req.body);

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Verify item exists
      const item = await prisma.item.findUnique({
        where: { id: validatedData.itemId },
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Calculate total amount
      const totalAmount = validatedData.quantity * validatedData.unitPrice;

      // Generate gatePass number
      const gatePassNumber = `BILL-${Date.now()}`;

      // Create gatePass record with GatePassItem
      const gatePass = await prisma.gatePass.create({
        data: {
          gatePassNumber,
          projectId: validatedData.projectId,
          gatePassDate: new Date(validatedData.gatePassDate),
          subtotal: totalAmount,
          totalAmount,
          taxAmount: 0,
          discountAmount: 0,
          notes: validatedData.description,
          createdBy: req.user!.id,
          items: {
            create: [
              {
                itemId: validatedData.itemId,
                quantity: validatedData.quantity,
                unitPrice: validatedData.unitPrice,
                size: validatedData.size,
                totalPrice: totalAmount,
              },
            ],
          },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              siteAddress: true,
            },
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                },
              },
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'GatePass',
          entityId: gatePass.id,
          newValues: JSON.stringify({
            projectId: validatedData.projectId,
            itemId: validatedData.itemId,
            quantity: validatedData.quantity,
            totalAmount,
          }),
        },
      });

      res.status(201).json({
        status: 'success',
        data: { gatePass },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateGatePass(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateGatePassSchema.parse(req.body);

      const existingGatePass = await prisma.gatePass.findUnique({
        where: { id },
      });

      if (!existingGatePass) {
        throw new AppError('GatePass record not found', 404);
      }

      const updateData: any = {};

      if (validatedData.projectId) {
        const project = await prisma.project.findUnique({
          where: { id: validatedData.projectId },
        });
        if (!project) {
          throw new AppError('Project not found', 404);
        }
        updateData.projectId = validatedData.projectId;
      }

      if (validatedData.itemId) {
        const item = await prisma.item.findUnique({
          where: { id: validatedData.itemId },
        });
        if (!item) {
          throw new AppError('Item not found', 404);
        }
        updateData.itemId = validatedData.itemId;
      }

      if (validatedData.description !== undefined) updateData.notes = validatedData.description;
      if (validatedData.gatePassDate) updateData.gatePassDate = new Date(validatedData.gatePassDate);

      // Note: To update quantities/prices, you need to update GatePassItems separately
      // This update only handles gatePass-level fields

      const gatePass = await prisma.gatePass.update({
        where: { id },
        data: updateData,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'GatePass',
          entityId: id,
          newValues: JSON.stringify(updateData),
        },
      });

      res.json({
        status: 'success',
        data: { gatePass },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteGatePass(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const gatePass = await prisma.gatePass.findUnique({
        where: { id },
      });

      if (!gatePass) {
        throw new AppError('GatePass record not found', 404);
      }

      await prisma.gatePass.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'DELETE',
          entityType: 'GatePass',
          entityId: id,
          oldValues: JSON.stringify({
            projectId: gatePass.projectId,
            totalAmount: gatePass.totalAmount,
          }),
        },
      });

      res.json({
        status: 'success',
        message: 'GatePass record deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async createBulkGatePass(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createBulkGatePassSchema.parse(req.body);

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Verify all items exist
      const itemIds = validatedData.items.map(item => item.itemId);
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds } },
      });

      if (items.length !== itemIds.length) {
        throw new AppError('One or more items not found', 404);
      }

      // Generate gatePass number
      const gatePassNumber = `BILL-${Date.now()}`;

      // Create gatePass record with multiple GatePassItems and reduce inventory
      const gatePass = await prisma.$transaction(async (tx) => {
        // Create gatePass record
        const newGatePass = await tx.gatePass.create({
          data: {
            gatePassNumber,
            projectId: validatedData.projectId,
            gatePassDate: new Date(validatedData.gatePassDate),
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
            subtotal: validatedData.subtotal,
            taxAmount: validatedData.taxAmount,
            discountAmount: validatedData.discountAmount,
            totalAmount: validatedData.totalAmount,
            status: 'gatePassed',
            notes: validatedData.notes,
            createdBy: req.user!.id,
            items: {
              create: validatedData.items.map(item => ({
                itemId: item.itemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                size: item.size,
                totalPrice: item.totalPrice,
              })),
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                projectCode: true,
                siteAddress: true,
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
        });

        // Reduce inventory for each item (stock is reduced when gatePass is created)
        for (const item of validatedData.items) {
          await tx.item.update({
            where: { id: item.itemId },
            data: {
              currentQuantity: {
                decrement: Number(item.quantity),
              },
            },
          });

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              itemId: item.itemId,
              movementType: 'out',
              quantity: Number(item.quantity),
              projectId: validatedData.projectId,
              referenceType: 'gatePass',
              referenceId: newGatePass.id,
              notes: `GatePassed: ${gatePassNumber}`,
              performedBy: req.user!.id,
            },
          });
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'CREATE',
            entityType: 'GatePass',
            entityId: newGatePass.id,
            newValues: JSON.stringify({
              projectId: validatedData.projectId,
              itemsCount: validatedData.items.length,
              totalAmount: validatedData.totalAmount,
              inventoryReduced: true,
            }),
          },
        });

        return newGatePass;
      });

      res.status(201).json({
        status: 'success',
        data: { gatePass },
      });
    } catch (error) {
      next(error);
    }
  }

  async getGatePassesByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      const gatePasses = await prisma.gatePass.findMany({
        where: { projectId },
        include: {
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { gatePassDate: 'desc' },
      });

      const totalAmount = gatePasses.reduce((sum, gatePass) => sum + Number(gatePass.totalAmount), 0);

      res.json({
        status: 'success',
        data: {
          projectId,
          projectName: project.name,
          gatePasses,
          total: gatePasses.length,
          totalAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update gatePass status (payment tracking only)
   * Note: Inventory is already reduced when gatePass is created, not when payment is made
   */
  async updateGatePassStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['pending', 'paid', 'fulfilled', 'cancelled'].includes(status)) {
        throw new AppError('Invalid status. Must be: pending, paid, fulfilled, or cancelled', 400);
      }

      const existingGatePass = await prisma.gatePass.findUnique({
        where: { id },
      });

      if (!existingGatePass) {
        throw new AppError('GatePass record not found', 404);
      }

      // Update gatePass status (no inventory changes - that happens at gatePass creation)
      const gatePass = await prisma.$transaction(async (tx) => {
        const updatedGatePass = await tx.gatePass.update({
          where: { id },
          data: { 
            status,
            paymentDate: status === 'paid' ? new Date() : existingGatePass.paymentDate,
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'UPDATE_STATUS',
            entityType: 'GatePass',
            entityId: id,
            oldValues: JSON.stringify({ status: existingGatePass.status }),
            newValues: JSON.stringify({ status }),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });

        return updatedGatePass;
      });

      res.json({
        status: 'success',
        message: `GatePass status updated to ${status}`,
        data: gatePass,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GatePassController();
