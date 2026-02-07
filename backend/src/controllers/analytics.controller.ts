import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class AnalyticsController {
  // Stock usage analytics
  async getStockUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, itemId } = req.query;

      const where: any = {
        movementType: 'out',
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      if (itemId) where.itemId = itemId;

      const stockMovements = await prisma.stockMovement.groupBy({
        by: ['itemId'],
        where,
        _sum: {
          quantity: true,
        },
        _count: {
          id: true,
        },
      });

      // Get item details
      const itemIds = stockMovements.map((sm: any) => sm.itemId);
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: {
          id: true,
          name: true,
          barcode: true,
          unitOfMeasurement: true,
          currentQuantity: true,
        },
      });

      type StockItemType = typeof items[0];
      const itemMap = new Map<string, StockItemType>(items.map((item: StockItemType) => [item.id, item]));

      const stockUsageData = stockMovements.map((sm: any) => ({
        item: itemMap.get(sm.itemId),
        totalQuantityUsed: sm._sum.quantity || 0,
        movementCount: sm._count.id,
      }));

      res.json({
        status: 'success',
        data: { stockUsage: stockUsageData },
      });
    } catch (error) {
      next(error);
    }
  }

  // Project consumption analytics
  async getProjectConsumption(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, startDate, endDate } = req.query;

      if (!projectId) {
        throw new AppError('Project ID is required', 400);
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId as string },
        select: {
          id: true,
          name: true,
          budget: true,
        },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Stock consumption
      const stockWhere: any = {
        projectId: projectId as string,
        movementType: 'out',
      };

      if (startDate || endDate) {
        stockWhere.createdAt = {};
        if (startDate) stockWhere.createdAt.gte = new Date(startDate as string);
        if (endDate) stockWhere.createdAt.lte = new Date(endDate as string);
      }

      const stockConsumption = await prisma.stockMovement.groupBy({
        by: ['itemId'],
        where: stockWhere,
        _sum: {
          quantity: true,
        },
      });

      const itemIds = stockConsumption.map((sc: any) => sc.itemId);
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: {
          id: true,
          name: true,
          barcode: true,
          unitCost: true,
          unitOfMeasurement: true,
        },
      });

      type ItemType = typeof items[0];
      const itemMap = new Map<string, ItemType>(items.map((item: ItemType) => [item.id, item]));

      const consumptionData = stockConsumption.map((sc: any) => {
        const item = itemMap.get(sc.itemId);
        const quantity = sc._sum.quantity || 0;
        const unitCost = item?.unitCost ? Number(item.unitCost) : 0;
        const estimatedCost = unitCost ? quantity * unitCost : 0;

        return {
          item,
          quantityUsed: quantity,
          estimatedCost,
        };
      });

      // Billing totals
      const billingWhere: any = { projectId: projectId as string };
      if (startDate || endDate) {
        billingWhere.billingDate = {};
        if (startDate) billingWhere.billingDate.gte = new Date(startDate as string);
        if (endDate) billingWhere.billingDate.lte = new Date(endDate as string);
      }

      const billingTotal = await prisma.gatePass.aggregate({
        where: billingWhere,
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
      });

      // Purchase order totals (Note: PurchaseOrder doesn't have projectId in schema)
      // This query gets all POs - you may want to filter differently
      const poTotal = await prisma.purchaseOrder.aggregate({
        _sum: {
          totalAmount: true,
        },
        _count: true,
      });

      const totalEstimatedCost = consumptionData.reduce((sum: number, item: any) => sum + item.estimatedCost, 0);

      res.json({
        status: 'success',
        data: {
          project,
          consumption: consumptionData,
          summary: {
            totalItemsUsed: consumptionData.length,
            totalEstimatedCost,
            totalBillingAmount: billingTotal._sum.totalAmount || 0,
            billingCount: billingTotal._count.id,
            totalPurchaseOrders: Number(poTotal._sum?.totalAmount || 0),
            purchaseOrderCount: poTotal._count || 0,
            budgetUtilization: project.budget
              ? ((totalEstimatedCost / Number(project.budget)) * 100).toFixed(2)
              : null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Supplier performance analytics
  async getSupplierPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { supplierId, startDate, endDate } = req.query;

      const where: any = {};
      if (supplierId) where.supplierId = supplierId;
      
      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) where.orderDate.gte = new Date(startDate as string);
        if (endDate) where.orderDate.lte = new Date(endDate as string);
      }

      const supplierStats = await prisma.purchaseOrder.groupBy({
        by: ['supplierId', 'status'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          totalAmount: true,
        },
      });

      // Get supplier details
      const supplierIds = [...new Set(supplierStats.map((ss: any) => ss.supplierId))] as string[];
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      });

      type SupplierType = typeof suppliers[0];
      const supplierMap = new Map<string, SupplierType>(suppliers.map((s: SupplierType) => [s.id, s]));

      // Group by supplier
      const performanceData = supplierIds.map((supplierId) => {
        const supplierOrders = supplierStats.filter((ss: any) => ss.supplierId === supplierId);
        const totalOrders = supplierOrders.reduce((sum: number, so: any) => sum + so._count.id, 0);
        const totalAmount = supplierOrders.reduce((sum: number, so: any) => sum + (so._sum.totalAmount || 0), 0);

        const statusBreakdown = supplierOrders.map((so: any) => ({
          status: so.status,
          count: so._count.id,
          amount: so._sum.totalAmount || 0,
        }));

        const receivedOrders = supplierOrders.find((so: any) => so.status === 'received')?._count.id || 0;
        const fulfillmentRate = totalOrders > 0 ? ((receivedOrders / totalOrders) * 100).toFixed(2) : '0';

        return {
          supplier: supplierMap.get(supplierId),
          totalOrders,
          totalAmount,
          fulfillmentRate: `${fulfillmentRate}%`,
          statusBreakdown,
        };
      });

      res.json({
        status: 'success',
        data: { supplierPerformance: performanceData },
      });
    } catch (error) {
      next(error);
    }
  }

  // Cost breakdown analytics
  async getCostBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, startDate, endDate } = req.query;

      const where: any = {};
      if (projectId) where.projectId = projectId;
      
      if (startDate || endDate) {
        where.gatePassDate = {};
        if (startDate) where.gatePassDate.gte = new Date(startDate as string);
        if (endDate) where.gatePassDate.lte = new Date(endDate as string);
      }

      // Billing breakdown by project
      const billingByProject = await prisma.gatePass.groupBy({
        by: ['projectId'],
        where,
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
      });

      const projectIds = billingByProject.map((b: any) => b.projectId);
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          name: true,
          budget: true,
        },
      });

      type ProjectType = typeof projects[0];
      const projectMap = new Map<string, ProjectType>(projects.map((p: ProjectType) => [p.id, p]));

      const costBreakdown = billingByProject.map((b: any) => {
        const project = projectMap.get(b.projectId);
        const totalAmount = b._sum.totalAmount || 0;
        const budgetUtilization = project?.budget
          ? ((totalAmount / Number(project.budget)) * 100).toFixed(2)
          : null;

        return {
          project,
          totalBillingAmount: totalAmount,
          recordCount: b._count.id,
          budgetUtilization: budgetUtilization ? `${budgetUtilization}%` : 'N/A',
        };
      });

      // Overall summary
      const overallTotal = costBreakdown.reduce((sum: number, cb: any) => sum + cb.totalBillingAmount, 0);

      res.json({
        status: 'success',
        data: {
          costBreakdown,
          summary: {
            totalProjects: costBreakdown.length,
            overallTotal,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Low stock alerts
  async getLowStockItems(_req: Request, res: Response, next: NextFunction) {
    try {
      const lowStockItems = await prisma.$queryRaw`
        SELECT 
          id, name, barcode, currentQuantity as currentStock, 
          minStockLevel, unitOfMeasurement
        FROM items
        WHERE isActive = 1 
          AND currentQuantity <= minStockLevel
        ORDER BY currentQuantity ASC
      `;

      // Also get category info for each item
      const itemIds = (lowStockItems as any[]).map(item => item.id);
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: {
          id: true,
          name: true,
          barcode: true,
          currentQuantity: true,
          minStockLevel: true,
          unitOfMeasurement: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          currentQuantity: 'asc',
        },
      });

      res.json({
        status: 'success',
        data: {
          lowStockItems: items,
          total: items.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Dashboard overview
  async getDashboardOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalItems,
        activeProjects,
        totalSuppliers,
        pendingPOs,
        lowStockCount,
        recentBillings,
      ] = await Promise.all([
        prisma.item.count({ where: { isActive: true } }),
        prisma.project.count({ where: { status: 'active' } }),
        prisma.supplier.count({ where: { isActive: true } }),
        prisma.purchaseOrder.count({ where: { status: { in: ['pending', 'approved'] } } }),
        prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM items 
          WHERE isActive = 1 
            AND currentQuantity <= minStockLevel
        `.then((result: any) => result[0]?.count || 0),
        prisma.gatePass.aggregate({
          where: {
            gatePassDate: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
          _sum: {
            totalAmount: true,
          },
          _count: true,
        }),
      ]);

      res.json({
        status: 'success',
        data: {
          overview: {
            totalItems,
            activeProjects,
            totalSuppliers,
            pendingPurchaseOrders: pendingPOs,
            lowStockAlerts: lowStockCount,
            last30DaysBilling: {
              totalAmount: recentBillings._sum?.totalAmount || 0,
              recordCount: recentBillings._count || 0,
            },
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AnalyticsController();
