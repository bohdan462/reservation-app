import express, { Application } from 'express';
import cors from 'cors';
import reservationRoutes, { cancelRouter } from './modules/reservations/reservation.routes';
import waitlistRoutes from './modules/waitlist/waitlist.routes';
import publicRoutes from './modules/public/public.routes';
import settingsRoutes from './modules/settings/settings.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import capacityRoutes from './modules/capacity/capacity.routes';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './openapi';

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/waitlist', waitlistRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/capacity', capacityRoutes);

  // Public routes (no /api prefix) - legacy support
  app.use('/reservations', cancelRouter);

  // OpenAPI / Swagger docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/openapi.json', (req, res) => res.json(openapiSpec));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
