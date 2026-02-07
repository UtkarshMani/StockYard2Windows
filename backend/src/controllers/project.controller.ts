import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  siteAddress: z.string().min(1, 'Site address is required'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
  projectManagerId: z.string().uuid(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).default('planning'),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  siteAddress: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
  projectManagerId: z.string().uuid().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
});

export class ProjectController {
  async getAllProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, projectManagerId } = req.query;

      const where: any = {};
      if (status) where.status = status;
      if (projectManagerId) where.projectManagerId = projectManagerId;

      const projects = await prisma.project.findMany({
        where,
        include: {
          projectManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          _count: {
            select: {
              stockMovements: true,
              gatePasses: true,

            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        status: 'success',
        data: { projects, total: projects.length },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          projectManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          stockMovements: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          gatePasses: {
            include: {
              items: {
                select: {
                  id: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          _count: {
            select: {
              stockMovements: true,
              gatePasses: true,
            },
          },
        },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      res.json({
        status: 'success',
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createProjectSchema.parse(req.body);

      // Verify project manager exists and has correct role
      const projectManager = await prisma.user.findUnique({
        where: { id: validatedData.projectManagerId },
      });

      if (!projectManager) {
        throw new AppError('Project manager not found', 404);
      }

      if (projectManager.role !== 'project_manager' && projectManager.role !== 'admin') {
        throw new AppError('User must have project_manager or admin role', 400);
      }

      if (!projectManager.isActive) {
        throw new AppError('Project manager account is inactive', 400);
      }

      // Generate unique project code
      const projectCount = await prisma.project.count();
      const projectCode = `PRJ${String(projectCount + 1).padStart(5, '0')}`;

      // @ts-ignore
      const project = await prisma.project.create({
        // @ts-ignore
        data: {
          ...validatedData,
          projectCode,
          startDate: new Date(validatedData.startDate),
          endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        },
        include: {
          projectManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({
        status: 'success',
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateProjectSchema.parse(req.body);

      const existingProject = await prisma.project.findUnique({
        where: { id },
      });

      if (!existingProject) {
        throw new AppError('Project not found', 404);
      }

      // If updating project manager, verify the user
      if (validatedData.projectManagerId) {
        const projectManager = await prisma.user.findUnique({
          where: { id: validatedData.projectManagerId },
        });

        if (!projectManager) {
          throw new AppError('Project manager not found', 404);
        }

        if (projectManager.role !== 'project_manager' && projectManager.role !== 'admin') {
          throw new AppError('User must have project_manager or admin role', 400);
        }

        if (!projectManager.isActive) {
          throw new AppError('Project manager account is inactive', 400);
        }
      }

      const updateData: any = { ...validatedData };
      if (validatedData.startDate) {
        updateData.startDate = new Date(validatedData.startDate);
      }
      if (validatedData.endDate) {
        updateData.endDate = new Date(validatedData.endDate);
      }

      const project = await prisma.project.update({
        where: { id },
        data: updateData,
        include: {
          projectManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      res.json({
        status: 'success',
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              stockMovements: true,
              gatePasses: true,
            },
          },
        },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check if project has associated records
      const hasRecords =
        (project._count as any).stockMovements > 0 ||
        (project._count as any).gatePasses > 0;

      if (hasRecords) {
        throw new AppError(
          'Cannot delete project with associated stock movements or gatePasses',
          400
        );
      }

      await prisma.project.delete({
        where: { id },
      });

      res.json({
        status: 'success',
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Get total items used
      const itemsUsed = await prisma.stockMovement.aggregate({
        where: {
          projectId: id,
          movementType: 'out',
        },
        _sum: {
          quantity: true,
        },
      });

      // Get total billing amount
      const totalGatePass = await prisma.gatePass.aggregate({
        _sum: {
          totalAmount: true,
        },
      });

      // Get purchase order totals
      const purchaseOrders = await prisma.purchaseOrder.aggregate({
        _sum: {
          totalAmount: true,
        },
      });

      res.json({
        status: 'success',
        data: {
          projectId: id,
          projectName: project.name,
          budget: project.budget,
          totalItemsUsed: itemsUsed._sum.quantity || 0,
          totalGatePassAmount: totalGatePass._sum.totalAmount || 0,
          totalPurchaseOrders: purchaseOrders._sum.totalAmount || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProjectController();
