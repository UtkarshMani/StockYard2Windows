import { Router } from 'express';
import purchaseOrderController from '../controllers/purchase-order.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all purchase orders
router.get('/', purchaseOrderController.getAllPurchaseOrders.bind(purchaseOrderController));

// Get purchase order by ID
router.get('/:id', purchaseOrderController.getPurchaseOrderById.bind(purchaseOrderController));

// Create purchase order
router.post('/', purchaseOrderController.createPurchaseOrder.bind(purchaseOrderController));

// Update purchase order
router.patch('/:id', purchaseOrderController.updatePurchaseOrder.bind(purchaseOrderController));

// Receive purchase order
router.post('/:id/receive', purchaseOrderController.receivePurchaseOrder.bind(purchaseOrderController));

// Delete purchase order
router.delete('/:id', purchaseOrderController.deletePurchaseOrder.bind(purchaseOrderController));

export default router;
