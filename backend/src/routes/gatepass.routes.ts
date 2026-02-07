import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import gatepassController from '../controllers/gatepass.controller';

const router = Router();
router.use(authenticate);

// Get all gatepasss
router.get('/', gatepassController.getAllGatePasses.bind(gatepassController));

// Get gatepass by ID
router.get('/:id', gatepassController.getGatePassById.bind(gatepassController));

// Get gatepasss by project
router.get('/project/:projectId', gatepassController.getGatePassesByProject.bind(gatepassController));

// Create gatepass (admin/gatepass_staff/warehouse_staff)
router.post(
  '/',
  authorize('admin', 'gatepass_staff', 'warehouse_staff'),
  gatepassController.createGatePass.bind(gatepassController)
);

// Create bulk gatepass with multiple items (admin/gatepass_staff/warehouse_staff)
router.post(
  '/bulk',
  authorize('admin', 'gatepass_staff', 'warehouse_staff'),
  gatepassController.createBulkGatePass.bind(gatepassController)
);

// Update gatepass (admin/gatepass_staff/warehouse_staff)
router.put(
  '/:id',
  authorize('admin', 'gatepass_staff', 'warehouse_staff'),
  gatepassController.updateGatePass.bind(gatepassController)
);

// Update gatepass status (triggers inventory updates)
router.patch(
  '/:id/status',
  authorize('admin', 'gatepass_staff', 'warehouse_staff'),
  gatepassController.updateGatePassStatus.bind(gatepassController)
);

// Delete gatepass (admin only)
router.delete(
  '/:id',
  authorize('admin'),
  gatepassController.deleteGatePass.bind(gatepassController)
);

export default router;
