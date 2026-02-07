import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import projectController from '../controllers/project.controller';

const router = Router();
router.use(authenticate);

// Get all projects
router.get('/', projectController.getAllProjects.bind(projectController));

// Get project by ID
router.get('/:id', projectController.getProjectById.bind(projectController));

// Get project statistics
router.get('/:id/stats', projectController.getProjectStats.bind(projectController));

// Create project (admin/project_manager only)
router.post(
  '/',
  authorize('admin', 'project_manager'),
  projectController.createProject.bind(projectController)
);

// Update project (admin/project_manager only)
router.put(
  '/:id',
  authorize('admin', 'project_manager'),
  projectController.updateProject.bind(projectController)
);

// Delete project (admin only)
router.delete(
  '/:id',
  authorize('admin'),
  projectController.deleteProject.bind(projectController)
);

export default router;
