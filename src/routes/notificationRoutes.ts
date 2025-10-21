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
  .post('/', createNotification)
  .get('/', getUserNotifications)
  .put('/:id/read', markAsRead)
  .put('/read-all', markAllAsRead)
  .delete('/:id', deleteNotification);

// Advanced notification routes
notificationRoutes.post('/bulk', createBulkNotifications);
notificationRoutes.post('/scheduled', createScheduledNotification);
notificationRoutes.get('/stats', getNotificationStats);
notificationRoutes.get('/preferences', getNotificationPreferences);
notificationRoutes.put('/preferences', updateNotificationPreferences);

export default notificationRoutes;
