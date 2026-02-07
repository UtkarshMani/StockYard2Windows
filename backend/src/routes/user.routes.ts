import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import userController from '../controllers/user.controller';

const router = Router();
router.use(authenticate);

// Get all users (admin only)
router.get('/', authorize('admin'), userController.getAllUsers.bind(userController));

// Get user by ID
router.get('/:id', userController.getUserById.bind(userController));

// Create user (admin only)
router.post('/', authorize('admin'), userController.createUser.bind(userController));

// Update user (admin only)
router.put('/:id', authorize('admin'), userController.updateUser.bind(userController));

// Delete/deactivate user (admin only)
router.delete('/:id', authorize('admin'), userController.deleteUser.bind(userController));

// Change password
router.post('/:id/change-password', userController.changePassword.bind(userController));

// Reset password (admin only - no current password required)
router.post('/:id/reset-password', authorize('admin'), userController.resetPassword.bind(userController));

// Hard delete user (admin only - permanent deletion)
router.delete('/:id/hard-delete', authorize('admin'), userController.hardDeleteUser.bind(userController));

export default router;
