import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const createItemSchema = z.object({
  barcode: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().optional(),
  unitOfMeasurement: z.string().min(1),
  currentQuantity: z.number().default(0),
  minStockLevel: z.number().default(0),
  maxStockLevel: z.number().optional(),
  unitCost: z.number().optional(),
  sellingPrice: z.number().optional(),
  location: z.string().optional(),
  imageUrl: z.string().url().optional(),
  attributes: z.array(z.object({
    attributeId: z.string().uuid(),
    value: z.string(),
  })).optional(),
});

export class ItemController {
  async getAllItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search, categoryId, isActive } = req.query;
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { barcode: { contains: search as string, mode: 'insensitive' } },
          { brand: { contains: search as string, mode: 'insensitive' } },
        ];
      }
      
      if (categoryId) where.categoryId = categoryId;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const [items, total] = await Promise.all([
        prisma.item.findMany({
          where,
          include: {
            category: { select: { id: true, name: true } },
            attributeValues: {
              include: {
                attribute: {
                  select: {
                    id: true,
                    name: true,
                    label: true,
                    inputType: true,
                  },
                },
              },
            },
          },
          skip,
          take,
          orderBy: { name: 'asc' },
        }),
        prisma.item.count({ where }),
      ]);

      res.json({
        status: 'success',
        data: {
          items,
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

  async getItemById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const item = await prisma.item.findUnique({
        where: { id },
        include: {
          category: true,
          attributeValues: {
            include: {
              attribute: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                  inputType: true,
                  options: true,
                  helpText: true,
                },
              },
            },
          },
          stockMovements: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              performer: {
                select: { fullName: true, email: true },
              },
              project: {
                select: { name: true, projectCode: true },
              },
            },
          },
        },
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      res.json({
        status: 'success',
        data: { item },
      });
    } catch (error) {
      next(error);
    }
  }

  async getItemByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const { barcode } = req.params;

      const item = await prisma.item.findUnique({
        where: { barcode },
        include: {
          category: true,
          attributeValues: {
            include: {
              attribute: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                  inputType: true,
                },
              },
            },
          },
        },
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      res.json({
        status: 'success',
        data: { item },
      });
    } catch (error) {
      next(error);
    }
  }

  async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createItemSchema.parse(req.body);
      const { attributes, ...itemData } = validatedData;

      // Check if barcode already exists
      const existingItem = await prisma.item.findUnique({
        where: { barcode: validatedData.barcode },
      });

      if (existingItem) {
        throw new AppError('Item with this barcode already exists', 400);
      }

      // Use transaction to create item and initial stock movement
      const result = await prisma.$transaction(async (tx) => {
        // Create the item
        // @ts-ignore
        const item = await tx.item.create({
          // @ts-ignore
          data: itemData,
          include: {
            category: true,
            attributeValues: {
              include: {
                attribute: true,
              },
            },
          },
        });

        // Create attribute values if provided
        if (attributes && attributes.length > 0) {
          await tx.itemAttributeValue.createMany({
            data: attributes.map(attr => ({
              itemId: item.id,
              attributeId: attr.attributeId,
              value: attr.value,
            })),
          });

          // Fetch the item again with attribute values
          const updatedItem = await tx.item.findUnique({
            where: { id: item.id },
            include: {
              category: true,
              attributeValues: {
                include: {
                  attribute: true,
                },
              },
            },
          });

          // Use updatedItem for further processing
          if (updatedItem) {
            Object.assign(item, updatedItem);
          }
        }

        // Create initial stock movement if currentQuantity > 0
        if (itemData.currentQuantity > 0) {
          await tx.stockMovement.create({
            data: {
              itemId: item.id,
              movementType: 'stock_in',
              quantity: itemData.currentQuantity,
              unitCost: itemData.unitCost,
              notes: 'Initial stock - Item created',
              performedBy: req.user!.id,
            },
          });
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: req.user?.id,
            action: 'ITEM_CREATED',
            entityType: 'Item',
            entityId: item.id,
            newValues: JSON.stringify(item),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });

        return item;
      });

      res.status(201).json({
        status: 'success',
        message: 'Item created successfully',
        data: { item: result },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = createItemSchema.partial().parse(req.body);
      const { attributes, ...itemData } = validatedData;

      const existingItem = await prisma.item.findUnique({ where: { id } });

      if (!existingItem) {
        throw new AppError('Item not found', 404);
      }

      // If barcode is being updated, check uniqueness
      if (itemData.barcode && itemData.barcode !== existingItem.barcode) {
        const barcodeExists = await prisma.item.findUnique({
          where: { barcode: itemData.barcode },
        });

        if (barcodeExists) {
          throw new AppError('Item with this barcode already exists', 400);
        }
      }

      // Check if currentQuantity is being updated
      const quantityChanged = itemData.currentQuantity !== undefined && 
                              itemData.currentQuantity !== Number(existingItem.currentQuantity);

      const result = await prisma.$transaction(async (tx) => {
        // Update the item
        const item = await tx.item.update({
          where: { id },
          data: itemData,
          include: {
            category: true,
            attributeValues: {
              include: {
                attribute: true,
              },
            },
          },
        });

        // Update attribute values if provided
        if (attributes && attributes.length > 0) {
          // Delete existing attribute values
          await tx.itemAttributeValue.deleteMany({
            where: { itemId: id },
          });

          // Create new attribute values
          await tx.itemAttributeValue.createMany({
            data: attributes.map(attr => ({
              itemId: id,
              attributeId: attr.attributeId,
              value: attr.value,
            })),
          });

          // Fetch the item again with updated attribute values
          const updatedItem = await tx.item.findUnique({
            where: { id },
            include: {
              category: true,
              attributeValues: {
                include: {
                  attribute: true,
                },
              },
            },
          });

          if (updatedItem) {
            Object.assign(item, updatedItem);
          }
        }

        // Create stock movement if quantity changed
        if (quantityChanged) {
          const quantityDiff = itemData.currentQuantity! - Number(existingItem.currentQuantity);
          const movementType = quantityDiff > 0 ? 'stock_in' : 'stock_out';
          
          await tx.stockMovement.create({
            data: {
              itemId: item.id,
              movementType,
              quantity: Math.abs(quantityDiff),
              unitCost: itemData.unitCost || existingItem.unitCost,
              notes: 'Manual adjustment - Item updated',
              performedBy: req.user!.id,
            },
          });
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: req.user?.id,
            action: 'ITEM_UPDATED',
            entityType: 'Item',
            entityId: item.id,
            oldValues: JSON.stringify(existingItem),
            newValues: JSON.stringify(item),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });

        return item;
      });

      res.json({
        status: 'success',
        message: 'Item updated successfully',
        data: { item: result },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }

  async deleteItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const item = await prisma.item.findUnique({ where: { id } });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Hard delete the item (cascade deletes will handle related records)
      await prisma.item.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'ITEM_DELETED',
          entityType: 'Item',
          entityId: id,
          oldValues: JSON.stringify(item),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.json({
        status: 'success',
        message: 'Item deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getLowStockItems(_req: Request, res: Response, next: NextFunction) {
    try {
      // Use raw SQL since Prisma doesn't support field-to-field comparison
      const items = await prisma.$queryRaw`
        SELECT 
          i.id, i.barcode, i.name, i.description, i.categoryId,
          i.brand, i.unitOfMeasurement,
          i.currentQuantity, i.minStockLevel, i.maxStockLevel,
          i.unitCost, i.sellingPrice, i.location, i.imageUrl,
          i.isActive, i.createdAt, i.updatedAt
        FROM items i
        WHERE i.isActive = 1 
          AND i.currentQuantity <= i.minStockLevel
        ORDER BY i.currentQuantity ASC
      `;

      // Get category info for each item
      // itemIds removed - not used
      const categories = await prisma.category.findMany({
        where: { id: { in: (items as any[]).map(i => i.categoryId).filter(Boolean) } },
        select: { id: true, name: true },
      });

      const categoryMap = new Map(categories.map(c => [c.id, c]));
      
      const itemsWithCategory = (items as any[]).map(item => ({
        ...item,
        category: item.categoryId ? categoryMap.get(item.categoryId) : null,
      }));

      res.json({
        status: 'success',
        data: { items: itemsWithCategory, count: itemsWithCategory.length },
      });
    } catch (error) {
      next(error);
    }
  }

  // Migration endpoint to create stock movements for existing items
  async migrateExistingItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get all items with currentQuantity > 0 that don't have stock movements
      const items = await prisma.item.findMany({
        where: {
          isActive: true,
        },
        include: {
          stockMovements: true,
        },
      });

      const itemsNeedingMigration = items.filter(
        item => Number(item.currentQuantity) > 0 && item.stockMovements.length === 0
      );

      if (itemsNeedingMigration.length === 0) {
        res.json({
          status: 'success',
          message: 'No items need migration',
          data: { migratedCount: 0 },
        });
        return;
      }

      // Create stock movements for each item
      const movements = await Promise.all(
        itemsNeedingMigration.map(item =>
          prisma.stockMovement.create({
            data: {
              itemId: item.id,
              movementType: 'stock_in',
              quantity: Number(item.currentQuantity),
              unitCost: item.unitCost,
              notes: 'Initial stock - Migrated from existing inventory',
              performedBy: req.user!.id,
            },
          })
        )
      );

      res.json({
        status: 'success',
        message: `Successfully migrated ${movements.length} items`,
        data: { migratedCount: movements.length },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ItemController();
