import { Router } from 'express';
import verifyToken from '../middleware/jwt/verifyToken';
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createBulkNotifications,
  createScheduledNotification,
  getNotificationStats,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../controller/notificationController';

const notificationRoutes = Router();
notificationRoutes.use(verifyToken);

// Basic notification routes
notificationRoutes
  .post('/', createNotification as any)
  .get('/', getUserNotifications as any)
  .put('/:id/read', markAsRead as any)
  .put('/read-all', markAllAsRead as any)
  .delete('/:id', deleteNotification as any);

// Advanced notification routes
notificationRoutes.post('/bulk', createBulkNotifications as any);
notificationRoutes.post('/scheduled', createScheduledNotification as any);
notificationRoutes.get('/stats', getNotificationStats as any);
notificationRoutes.get('/preferences', getNotificationPreferences as any);
notificationRoutes.put('/preferences', updateNotificationPreferences as any);

export default notificationRoutes;
