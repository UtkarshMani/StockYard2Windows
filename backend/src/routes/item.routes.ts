import { Router } from 'express';
import itemController from '../controllers/item.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', itemController.getAllItems);
router.get('/low-stock', itemController.getLowStockItems);
router.get('/barcode/:barcode', itemController.getItemByBarcode);
router.get('/:id', itemController.getItemById);

// Migration endpoint (admin only)
router.post('/migrate-stock-movements', authorize('admin'), itemController.migrateExistingItems);

// Admin and warehouse staff can create/update items
router.post('/', authorize('admin', 'warehouse_staff'), itemController.createItem);
router.put('/:id', authorize('admin', 'warehouse_staff'), itemController.updateItem);

// Only admin can delete items
router.delete('/:id', authorize('admin'), itemController.deleteItem);

export default router;
