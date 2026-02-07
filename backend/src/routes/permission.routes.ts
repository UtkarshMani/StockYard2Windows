import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import permissionController from '../controllers/permission.controller';

const router = Router();
router.use(authenticate);

// Get default permissions template
router.get('/defaults', permissionController.getDefaultPermissions.bind(permissionController));

// Get user permissions
router.get('/:userId', permissionController.getUserPermissions.bind(permissionController));

// Set user permissions (admin only)
router.put(
  '/:userId',
  authorize('admin'),
  permissionController.setUserPermissions.bind(permissionController)
);

export default router;
