import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import categoryController from '../controllers/category.controller';

const router = Router();
router.use(authenticate);

// Get all categories
router.get('/', categoryController.getAllCategories.bind(categoryController));

// Get category by ID
router.get('/:id', categoryController.getCategoryById.bind(categoryController));

// Create category (admin/warehouse_staff only)
router.post(
  '/',
  authorize('admin', 'warehouse_staff'),
  categoryController.createCategory.bind(categoryController)
);

// Update category (admin/warehouse_staff only)
router.put(
  '/:id',
  authorize('admin', 'warehouse_staff'),
  categoryController.updateCategory.bind(categoryController)
);

// Delete category (admin only)
router.delete(
  '/:id',
  authorize('admin'),
  categoryController.deleteCategory.bind(categoryController)
);

export default router;
