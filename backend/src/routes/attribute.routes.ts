import { Router } from 'express';
import * as attributeController from '../controllers/attribute.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Get all attributes (with category info)
router.get('/', authenticate, attributeController.getAllAttributes);

// Get attributes by category
router.get('/category/:categoryId', authenticate, attributeController.getAttributesByCategory);

// Get single attribute by ID
router.get('/:id', authenticate, attributeController.getAttributeById);

// Create new attribute (admin only)
router.post('/', authenticate, authorize('admin'), attributeController.createAttribute);

// Update attribute (admin only)
router.put('/:id', authenticate, authorize('admin'), attributeController.updateAttribute);

// Delete attribute (admin only)
router.delete('/:id', authenticate, authorize('admin'), attributeController.deleteAttribute);

// Reorder attributes within a category (admin only)
router.post('/category/:categoryId/reorder', authenticate, authorize('admin'), attributeController.reorderAttributes);

export default router;
