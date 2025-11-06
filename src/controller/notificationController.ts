import { RequestHandler, Request } from 'express';
import { PrismaClient } from '../generated/prisma';
import { getIO } from '../config/socket';

const prisma = new PrismaClient();
// nota, hacer clase service para que no se repita codigo y sea mas organizado

export const createNotification: RequestHandler = async (req, res, next) => {
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
  // Emit to the specific user if it's a direct notification
  if (userId) {
    getIO().to(`user_${userId}`).emit('notification', notification);
  }

  res.status(201).json(notification);
};

export const getUserNotifications: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }
  const notifications = await prisma.notification.findMany({
    where: { userId: (req.user as any).id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(notifications);
};

export const markAsRead: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }
  const id = Number(req.params.id);
  const notification = await prisma.notification.findUnique({
    where: { id },
  });
  if (!notification || notification.userId !== (req.user as any).id) {
    return res.status(404).json({ message: 'Notificación no encontrada' });
  }
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  res.json(updated);
};

export const markAllAsRead: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }
  await prisma.notification.updateMany({
    where: { userId: (req.user as any).id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: 'Todas las notificaciones marcadas como leídas' });
};

export const deleteNotification: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }
  const id = Number(req.params.id);
  const notification = await prisma.notification.findUnique({
    where: { id },
  });
  if (!notification || notification.userId !== (req.user as any).id) {
    return res.status(404).json({ message: 'Notificación no encontrada' });
  }
  await prisma.notification.delete({
    where: { id },
  });
  res.status(204).send();
};

// Helper function to create notification and emit socket event
export const createAndEmitNotification = async (userId: number, message: string, type: string, relatedId?: number, relatedType?: string, targetTutorId?: number) => {
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
  // Emit to the primary user
  io.to(`user_${userId}`).emit('notification', notification);
  // If there's a specific tutor to notify (e.g., for task updates), emit to them too
  if (targetTutorId && targetTutorId !== userId) {
    io.to(`user_${targetTutorId}`).emit('notification', notification);
  }
  return notification;
};

// Advanced notification features
export const createBulkNotifications: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { message, type, relatedId, relatedType, targetUserIds } = req.body;

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return res.status(400).json({ message: 'Se requiere una lista de IDs de usuario para notificaciones masivas.' });
    }

    const notifications = await Promise.all(
      targetUserIds.map((userId: number) =>
        prisma.notification.create({
          data: {
            userId,
            message,
            type,
            relatedId: relatedId ?? null,
            relatedType: relatedType ?? null,
          },
        })
      )
    );

    // Emit notifications to all users
    const io = getIO();
    notifications.forEach(notification => {
      io.to(`user_${notification.userId}`).emit('notification', notification);
    });

    res.status(201).json(notifications);
  } catch (error) {
    next(error);
  }
};

export const createScheduledNotification: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { message, type, relatedId, relatedType, scheduledAt, targetUserId } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ message: 'Se requiere fecha de programación.' });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ message: 'La fecha debe ser futura.' });
    }

    // Nota: Los campos scheduledAt e isScheduled no existen en el esquema actual
    // En una implementación real, se agregarían a la tabla de notificaciones
    // For now, this creates an immediate notification.
    // A full scheduled notification system would require:
    // 1. Adding `scheduledAt` and `isScheduled` fields to the Notification model in Prisma.
    // 2. A background job (like in reminderService) to check and emit these notifications when their scheduledAt time arrives.
    // For this example, we'll create it immediately and log that it's "scheduled"
    console.log(`[WARNING] Scheduled notification for user ${targetUserId || (req.user as any).id} at ${scheduledDate.toISOString()} is not fully implemented. Creating immediate notification.`);

    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId || (req.user as any).id,
        message,
        type,
        relatedId: relatedId ?? null,
        relatedType: relatedType ?? null,
        // In a real implementation, scheduledAt and isScheduled would be stored here
      },
    });

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

export const getNotificationStats: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const userId = (req.user as any).id;

    // Estadísticas de notificaciones del usuario
    const totalNotifications = await prisma.notification.count({
      where: { userId },
    });

    const unreadNotifications = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    const notificationsByType = await prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    // Notificaciones recientes (últimas 24 horas)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentNotifications = await prisma.notification.count({
      where: {
        userId,
        createdAt: {
          gte: yesterday,
        },
      },
    });

    res.json({
      total: totalNotifications,
      unread: unreadNotifications,
      recent: recentNotifications,
      byType: notificationsByType,
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    // En una implementación real, tendríamos una tabla de preferencias
    // Por ahora, devolvemos preferencias por defecto
    const preferences = {
      emailNotifications: true,
      pushNotifications: true,
      taskReminders: true,
      projectUpdates: true,
      messageNotifications: true,
      systemAlerts: true,
    };

    res.json(preferences);
  } catch (error) {
    next(error);
  }
};

export const updateNotificationPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { emailNotifications, pushNotifications, taskReminders, projectUpdates, messageNotifications, systemAlerts } = req.body;

    // En una implementación real, guardaríamos en BD
    // Por ahora, solo devolvemos confirmación
    const preferences = {
      emailNotifications: emailNotifications ?? true,
      pushNotifications: pushNotifications ?? true,
      taskReminders: taskReminders ?? true,
      projectUpdates: projectUpdates ?? true,
      messageNotifications: messageNotifications ?? true,
      systemAlerts: systemAlerts ?? true,
    };

    res.json({ message: 'Preferencias actualizadas', preferences });
  } catch (error) {
    next(error);
  }
};
