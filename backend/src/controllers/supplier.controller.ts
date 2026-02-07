import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export class SupplierController {
  async getAllSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive, search } = req.query;

      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const suppliers = await prisma.supplier.findMany({
        where,
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      res.json({
        status: 'success',
        data: { suppliers, total: suppliers.length },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSupplierById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
          purchaseOrders: {
            select: {
              id: true,
              poNumber: true,
              orderDate: true,
              status: true,
              totalAmount: true,
            },
            orderBy: { orderDate: 'desc' },
            take: 10,
          },
          _count: {
            select: { purchaseOrders: true },
          },
        },
      });

      if (!supplier) {
        throw new AppError('Supplier not found', 404);
      }

      res.json({
        status: 'success',
        data: { supplier },
      });
    } catch (error) {
      next(error);
    }
  }

  async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createSupplierSchema.parse(req.body);

      // Generate supplier code
      const supplierCount = await prisma.supplier.count();
      const supplierCode = `SUP-${new Date().getFullYear()}-${String(supplierCount + 1).padStart(4, "0")}`;

      // Check for duplicate name
      const existingSupplier = await prisma.supplier.findFirst({
        where: { name: validatedData.name },
      });

      if (existingSupplier) {
        throw new AppError('Supplier with this name already exists', 400);
      }

      // @ts-ignore
      const supplier = await prisma.supplier.create({
        data: { ...validatedData, supplierCode } as any,
      });

      res.status(201).json({
        status: 'success',
        data: { supplier },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateSupplierSchema.parse(req.body);

      const existingSupplier = await prisma.supplier.findUnique({
        where: { id },
      });

      if (!existingSupplier) {
        throw new AppError('Supplier not found', 404);
      }

      // Check for duplicate name if name is being updated
      if (validatedData.name) {
        const duplicate = await prisma.supplier.findFirst({
          where: {
            name: validatedData.name,
            NOT: { id },
          },
        });

        if (duplicate) {
          throw new AppError('Supplier with this name already exists', 400);
        }
      }

      const supplier = await prisma.supplier.update({
        where: { id },
        data: validatedData,
      });

      res.json({
        status: 'success',
        data: { supplier },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
        },
      });

      if (!supplier) {
        throw new AppError('Supplier not found', 404);
      }

      // Prevent deletion if supplier has purchase orders
      if (supplier._count.purchaseOrders > 0) {
        throw new AppError(
          'Cannot delete supplier with existing purchase orders. Deactivate instead.',
          400
        );
      }

      await prisma.supplier.delete({
        where: { id },
      });

      res.json({
        status: 'success',
        message: 'Supplier deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getSupplierStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const supplier = await prisma.supplier.findUnique({
        where: { id },
      });

      if (!supplier) {
        throw new AppError('Supplier not found', 404);
      }

      const stats = await prisma.purchaseOrder.aggregate({
        where: { supplierId: id },
        _count: { id: true },
        _sum: { totalAmount: true },
      });

      const statusBreakdown = await prisma.purchaseOrder.groupBy({
        by: ['status'],
        where: { supplierId: id },
        _count: { id: true },
      });

      res.json({
        status: 'success',
        data: {
          supplierId: id,
          supplierName: supplier.name,
          totalOrders: stats._count.id,
          totalAmount: stats._sum.totalAmount || 0,
          ordersByStatus: statusBreakdown,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SupplierController();
