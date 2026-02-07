import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import auditController from '../controllers/audit.controller';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

// Get all audit logs
router.get('/', auditController.getAllAuditLogs.bind(auditController));

// Get audit statistics
router.get('/stats', auditController.getAuditStats.bind(auditController));

// Get audit log by ID
router.get('/:id', auditController.getAuditLogById.bind(auditController));

// Get audit logs by entity
router.get('/entity/:entity/:entityId', auditController.getAuditLogsByEntity.bind(auditController));

// Get audit logs by user
router.get('/user/:userId', auditController.getAuditLogsByUser.bind(auditController));

export default router;
