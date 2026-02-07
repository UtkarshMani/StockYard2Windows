import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import supplierController from '../controllers/supplier.controller';

const router = Router();
router.use(authenticate);

// Get all suppliers
router.get('/', supplierController.getAllSuppliers.bind(supplierController));

// Get supplier by ID
router.get('/:id', supplierController.getSupplierById.bind(supplierController));

// Get supplier statistics
router.get('/:id/stats', supplierController.getSupplierStats.bind(supplierController));

// Create supplier (admin/warehouse_staff only)
router.post(
  '/',
  authorize('admin', 'warehouse_staff'),
  supplierController.createSupplier.bind(supplierController)
);

// Update supplier (admin/warehouse_staff only)
router.put(
  '/:id',
  authorize('admin', 'warehouse_staff'),
  supplierController.updateSupplier.bind(supplierController)
);

// Delete supplier (admin only)
router.delete(
  '/:id',
  authorize('admin'),
  supplierController.deleteSupplier.bind(supplierController)
);

export default router;
