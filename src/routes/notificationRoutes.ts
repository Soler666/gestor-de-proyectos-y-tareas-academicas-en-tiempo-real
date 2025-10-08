import { Router } from 'express';
import verifyToken from '../middleware/jwt/verifyToken';
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controller/notificationController';

const notificationRoutes = Router();
notificationRoutes.use(verifyToken);

notificationRoutes
  .post('/', createNotification)
  .get('/', getUserNotifications)
  .put('/:id/read', markAsRead)
  .put('/read-all', markAllAsRead)
  .delete('/:id', deleteNotification);

export default notificationRoutes;
