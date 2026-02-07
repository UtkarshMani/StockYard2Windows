import { Router } from 'express';
import stockController from '../controllers/stock.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// View stock movements (all authenticated users)
router.get('/movements', stockController.getStockMovements);

// Stock operations (admin and warehouse staff only)
router.post('/in', authorize('admin', 'warehouse_staff'), stockController.stockIn);
router.post('/out', authorize('admin', 'warehouse_staff'), stockController.stockOut);

// Adjustments (admin only)
router.post('/adjust', authorize('admin'), stockController.adjustStock);

export default router;
