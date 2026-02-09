import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import itemRoutes from './routes/item.routes';
import categoryRoutes from './routes/category.routes';
import projectRoutes from './routes/project.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseOrderRoutes from './routes/purchase-order.routes';
import stockRoutes from './routes/stock.routes';
import gatePassRoutes from './routes/gatepass.routes';
import analyticsRoutes from './routes/analytics.routes';
import auditRoutes from './routes/audit.routes';
import permissionRoutes from './routes/permission.routes';
import attributeRoutes from './routes/attribute.routes';
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rate-limiter.middleware';
import logger from './utils/logger';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { runMigrations } from './utils/migration';
import { getDatabasePath } from './config/database';

dotenv.config();

/**
 * Initialize and start the server
 */
async function startServer() {
  try {
    // Run database migrations first
    logger.info('🔄 Checking database migrations...');
    const migrationResult = await runMigrations();
    
    if (migrationResult.isFirstRun) {
      logger.info('🆕 First run - database initialized');
    } else {
      logger.info('✅ Database migrations completed');
    }
    
    logger.info(`💾 Using database: ${getDatabasePath()}`);

    const app: Application = express();
    const isEmbeddedMode = process.env.EMBEDDED_MODE === 'true';

    // Middleware
    app.use(helmet({
      contentSecurityPolicy: isEmbeddedMode ? false : undefined,
    }));
    app.use(cors({
      origin: isEmbeddedMode ? '*' : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
      credentials: true,
    }));
    app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

// Rate limiting (disabled in embedded mode)
if (!isEmbeddedMode) {
  app.use(rateLimiter);
}

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/items`, itemRoutes);
app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/projects`, projectRoutes);
app.use(`/api/${API_VERSION}/suppliers`, supplierRoutes);
app.use(`/api/${API_VERSION}/purchase-orders`, purchaseOrderRoutes);
app.use(`/api/${API_VERSION}/stock`, stockRoutes);
app.use(`/api/${API_VERSION}/gatepass`, gatePassRoutes);
app.use(`/api/${API_VERSION}/analytics`, analyticsRoutes);
app.use(`/api/${API_VERSION}/audit`, auditRoutes);
app.use(`/api/${API_VERSION}/permissions`, permissionRoutes);
app.use(`/api/${API_VERSION}/attributes`, attributeRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`Embedded Mode: ${isEmbeddedMode ? 'Yes' : 'No'}`);
      
      // Console output for embedded mode detection
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`Embedded Mode: ${isEmbeddedMode ? 'Yes' : 'No'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, closing server gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    return { app, server };
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default startServer;
