import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export class CategoryController {
  async getAllCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { items: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      res.json({
        status: 'success',
        data: { categories, total: categories.length },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          items: {
            select: {
              id: true,
              name: true,
              barcode: true,
              currentQuantity: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      });

      if (!category) {
        throw new AppError('Category not found', 404);
      }

      res.json({
        status: 'success',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createCategorySchema.parse(req.body);

      // Check if category with same name already exists
      const existingCategory = await prisma.category.findFirst({
        where: { name: validatedData.name },
      });

      if (existingCategory) {
        throw new AppError('Category with this name already exists', 400);
      }

      // @ts-ignore
      const category = await prisma.category.create({
        data: validatedData as any,
      });

      res.status(201).json({
        status: 'success',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateCategorySchema.parse(req.body);

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        throw new AppError('Category not found', 404);
      }

      // If name is being updated, check for duplicates
      if (validatedData.name) {
        const duplicate = await prisma.category.findFirst({
          where: {
            name: validatedData.name,
            NOT: { id },
          },
        });

        if (duplicate) {
          throw new AppError('Category with this name already exists', 400);
        }
      }

      const category = await prisma.category.update({
        where: { id },
        data: validatedData as any,
      });

      res.json({
        status: 'success',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { items: true },
          },
        },
      });

      if (!category) {
        throw new AppError('Category not found', 404);
      }

      // Prevent deletion if category has items
      if (category._count.items > 0) {
        throw new AppError(
          `Cannot delete category with ${category._count.items} items. Please reassign or delete items first.`,
          400
        );
      }

      await prisma.category.delete({
        where: { id },
      });

      res.json({
        status: 'success',
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CategoryController();
