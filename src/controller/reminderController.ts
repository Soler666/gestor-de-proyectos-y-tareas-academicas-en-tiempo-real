import { RequestHandler, Request } from 'express';
import { ReminderService } from '../service/reminderService';

interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

const reminderService = ReminderService.getInstance();

export const createReminder: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { title, description, scheduledAt, relatedId, relatedType } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ message: 'Título y fecha programada son requeridos.' });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ message: 'La fecha debe ser futura.' });
    }

    const reminder = await reminderService.createReminder({
      userId: req.user.id,
      title,
      description,
      scheduledAt: scheduledDate,
      relatedId,
      relatedType,
    });

    res.status(201).json(reminder);
  } catch (error) {
    next(error);
  }
};

export const getUserReminders: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const reminders = await reminderService.getRemindersByUser(req.user.id);
    res.json(reminders);
  } catch (error) {
    next(error);
  }
};

export const getReminderById: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const id = Number(req.params.id);
    const reminder = await reminderService.getReminderById(id);

    if (!reminder) {
      return res.status(404).json({ message: 'Recordatorio no encontrado.' });
    }

    if (reminder.userId !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para ver este recordatorio.' });
    }

    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

export const updateReminder: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const id = Number(req.params.id);
    const { title, description, scheduledAt, isActive, relatedId, relatedType } = req.body;

    const existingReminder = await reminderService.getReminderById(id);
    if (!existingReminder) {
      return res.status(404).json({ message: 'Recordatorio no encontrado.' });
    }

    if (existingReminder.userId !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para editar este recordatorio.' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scheduledAt !== undefined) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ message: 'La fecha debe ser futura.' });
      }
      updateData.scheduledAt = scheduledDate;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (relatedId !== undefined) updateData.relatedId = relatedId;
    if (relatedType !== undefined) updateData.relatedType = relatedType;

    const updatedReminder = await reminderService.updateReminder(id, updateData);
    res.json(updatedReminder);
  } catch (error) {
    next(error);
  }
};

export const deleteReminder: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const id = Number(req.params.id);
    const reminder = await reminderService.getReminderById(id);

    if (!reminder) {
      return res.status(404).json({ message: 'Recordatorio no encontrado.' });
    }

    if (reminder.userId !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este recordatorio.' });
    }

    await reminderService.deleteReminder(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Legacy endpoints for backward compatibility
export const scheduleReminder: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { message, scheduledAt, relatedId, relatedType } = req.body;

    if (!message || !scheduledAt) {
      return res.status(400).json({ message: 'Mensaje y fecha programada son requeridos.' });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ message: 'La fecha debe ser futura.' });
    }

    const jobId = await reminderService.scheduleCustomReminder(
      req.user.id,
      message,
      scheduledDate,
      relatedId,
      relatedType
    );

    res.status(201).json({
      message: 'Recordatorio programado exitosamente',
      jobId,
      scheduledAt: scheduledDate
    });
  } catch (error) {
    next(error);
  }
};

export const cancelReminder: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ message: 'ID del trabajo es requerido.' });
    }

    reminderService.cancelReminder(jobId);

    res.json({ message: 'Recordatorio cancelado exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const getReminderStatus: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    // Nota: Esta funcionalidad requeriría mantener un registro de recordatorios activos
    // Por ahora, devolvemos un mensaje informativo
    res.json({
      message: 'El servicio de recordatorios está activo',
      note: 'Los recordatorios programados se ejecutan automáticamente según la configuración'
    });
  } catch (error) {
    next(error);
  }
};
