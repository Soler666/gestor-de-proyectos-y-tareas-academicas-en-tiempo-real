import { RequestHandler, Request } from 'express';
import { PrismaClient } from '../generated/prisma';
import { getIO } from '../config/socket';

const prisma = new PrismaClient();
// nota, hacer clase service para que no se repita codigo y sea mas organizado
interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export const createNotification: RequestHandler = async (req: CustomRequest, res, next) => {
  const { userId, message, type, relatedId, relatedType } = req.body;
  const notification = await prisma.notification.create({
    data: {
      userId,
      message,
      type,
      relatedId,
      relatedType,
    },
  });
  res.status(201).json(notification);
};

export const getUserNotifications: RequestHandler = async (req: CustomRequest, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(notifications);
};

export const markAsRead: RequestHandler = async (req: CustomRequest, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }
  const id = Number(req.params.id);
  const notification = await prisma.notification.findUnique({
    where: { id },
  });
  if (!notification || notification.userId !== req.user.id) {
    return res.status(404).json({ message: 'Notificación no encontrada' });
  }
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  res.json(updated);
};

export const markAllAsRead: RequestHandler = async (req: CustomRequest, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: 'Todas las notificaciones marcadas como leídas' });
};

export const deleteNotification: RequestHandler = async (req: CustomRequest, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }
  const id = Number(req.params.id);
  const notification = await prisma.notification.findUnique({
    where: { id },
  });
  if (!notification || notification.userId !== req.user.id) {
    return res.status(404).json({ message: 'Notificación no encontrada' });
  }
  await prisma.notification.delete({
    where: { id },
  });
  res.status(204).send();
};

// Helper function to create notification and emit socket event
export const createAndEmitNotification = async (userId: number, message: string, type: string, relatedId?: number, relatedType?: string) => {

  const notification = await prisma.notification.create({
    data: {
      userId,
      message,
      type,
      relatedId: relatedId ?? null,
      relatedType: relatedType ?? null,
    },
  });
  // Emit to the specific user
  const io = getIO();
  io.to(`user_${userId}`).emit('notification', notification);
  return notification;

};
