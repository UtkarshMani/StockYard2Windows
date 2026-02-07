import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import analyticsController from '../controllers/analytics.controller';

const router = Router();
router.use(authenticate);

// Dashboard overview (all authenticated users)
router.get('/dashboard', analyticsController.getDashboardOverview.bind(analyticsController));

// Stock usage analytics (admin/warehouse_staff only)
router.get(
  '/stock-usage',
  authorize('admin', 'warehouse_staff'),
  analyticsController.getStockUsage.bind(analyticsController)
);

// Project consumption analytics (admin/project_manager/billing_staff)
router.get(
  '/project-consumption',
  authorize('admin', 'project_manager', 'billing_staff'),
  analyticsController.getProjectConsumption.bind(analyticsController)
);

// Supplier performance analytics (admin/warehouse_staff)
router.get(
  '/supplier-performance',
  authorize('admin', 'warehouse_staff'),
  analyticsController.getSupplierPerformance.bind(analyticsController)
);

// Cost breakdown analytics (admin/billing_staff)
router.get(
  '/cost-breakdown',
  authorize('admin', 'billing_staff'),
  analyticsController.getCostBreakdown.bind(analyticsController)
);

// Low stock items (admin/warehouse_staff)
router.get(
  '/low-stock',
  authorize('admin', 'warehouse_staff'),
  analyticsController.getLowStockItems.bind(analyticsController)
);

export default router;
