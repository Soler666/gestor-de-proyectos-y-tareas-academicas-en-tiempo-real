import * as cron from 'node-cron';
import prisma from '../config/database';
import { createAndEmitNotification } from '../controller/notificationController';

interface IReminder {
  id?: number;
  userId: number;
  title: string;
  description?: string;
  scheduledAt: Date;
  isActive?: boolean;
  relatedId?: number;
  relatedType?: string;
}

export class ReminderService {
  private static instance: ReminderService;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {
    this.initializeReminders();
  }

  public static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  private async initializeReminders() {
    // Ejecutar cada hora para verificar recordatorios
    cron.schedule('0 * * * *', async () => {
      await this.checkReminders();
    });

    console.log('Servicio de recordatorios inicializado');
  }

  private async checkReminders() {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Recordatorios para tareas con dueDate en 24 horas
    const tasks24Hours = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: twentyFourHoursFromNow,
        },
        status: {
          not: 'Completada',
        },
      },
      include: {
        responsible: true,
        project: true,
      },
    });

    for (const task of tasks24Hours) {
      await this.sendReminder(task, '24 horas', task.responsible.id);
    }

    // Recordatorios para tareas con dueDate en 1 hora
    const tasks1Hour = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: oneHourFromNow,
        },
        status: {
          not: 'Completada',
        },
      },
      include: {
        responsible: true,
        project: true,
      },
    });

    for (const task of tasks1Hour) {
      await this.sendReminder(task, '1 hora', task.responsible.id);
    }

    // Recordatorios para proyectos con endDate en 24 horas
    const projects24Hours = await prisma.project.findMany({
      where: {
        endDate: {
          gte: now,
          lte: twentyFourHoursFromNow,
        },
        status: {
          not: 'Completado',
        },
      },
      include: {
        participants: true,
        tutor: true,
      },
    });

    for (const project of projects24Hours) {
      const usersToNotify = [...project.participants];
      if (project.tutor) {
        usersToNotify.push(project.tutor);
      }
      for (const user of usersToNotify) {
        await this.sendProjectReminder(project, '24 horas', user.id);
      }
    }

    // Recordatorios para proyectos con endDate en 1 hora
    const projects1Hour = await prisma.project.findMany({
      where: {
        endDate: {
          gte: now,
          lte: oneHourFromNow,
        },
        status: {
          not: 'Completado',
        },
      },
      include: {
        participants: true,
        tutor: true,
      },
    });

    for (const project of projects1Hour) {
      const usersToNotify = [...project.participants];
      if (project.tutor) {
        usersToNotify.push(project.tutor);
      }
      for (const user of usersToNotify) {
        await this.sendProjectReminder(project, '1 hora', user.id);
      }
    }
  }

  private async sendReminder(task: any, timeLeft: string, userId: number) {
    const message = `Recordatorio: La tarea "${task.name}" vence en ${timeLeft}. ${task.project ? `Proyecto: ${task.project.name}` : ''}`;
    await createAndEmitNotification(userId, message, 'deadline_reminder', task.id, 'task');
  }

  private async sendProjectReminder(project: any, timeLeft: string, userId: number) {
    const message = `Recordatorio: El proyecto "${project.name}" vence en ${timeLeft}.`;
    await createAndEmitNotification(userId, message, 'deadline_reminder', project.id, 'project');
  }

  public async scheduleCustomReminder(userId: number, message: string, date: Date, relatedId?: number, relatedType?: string) {
    const jobId = `reminder_${userId}_${Date.now()}`;
    const cronExpression = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;

    const job = cron.schedule(cronExpression, async () => {
      await createAndEmitNotification(userId, message, 'custom_reminder', relatedId, relatedType);
      this.cronJobs.delete(jobId);
    });

    this.cronJobs.set(jobId, job);
    return jobId;
  }

  public cancelReminder(jobId: string) {
    const job = this.cronJobs.get(jobId);
    if (job) {
      job.stop();
      this.cronJobs.delete(jobId);
    }
  }

  // CRUD operations for custom reminders
  public async createReminder(reminderData: IReminder): Promise<any> {
    const reminder = await prisma.reminder.create({
      data: {
        userId: reminderData.userId,
        title: reminderData.title,
        description: reminderData.description || null,
        scheduledAt: reminderData.scheduledAt,
        isActive: reminderData.isActive ?? true,
        relatedId: reminderData.relatedId || null,
        relatedType: reminderData.relatedType || null,
      },
    });

    // Schedule the cron job
    const jobId = `reminder_${reminder.id}`;
    const cronExpression = `${reminder.scheduledAt.getMinutes()} ${reminder.scheduledAt.getHours()} ${reminder.scheduledAt.getDate()} ${reminder.scheduledAt.getMonth() + 1} *`;

    const job = cron.schedule(cronExpression, async () => {
      if (reminder.isActive) {
        await createAndEmitNotification(
          reminder.userId,
          `Recordatorio: ${reminder.title}${reminder.description ? ' - ' + reminder.description : ''}`,
          'custom_reminder',
          reminder.relatedId || undefined,
          reminder.relatedType || undefined
        );
        // Mark as inactive after execution
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { isActive: false },
        });
      }
      this.cronJobs.delete(jobId);
    });

    this.cronJobs.set(jobId, job);
    return reminder;
  }

  public async getRemindersByUser(userId: number): Promise<any[]> {
    return await prisma.reminder.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  public async getReminderById(id: number): Promise<any | null> {
    return await prisma.reminder.findUnique({
      where: { id },
    });
  }

  public async updateReminder(id: number, updateData: Partial<IReminder>): Promise<any> {
    const reminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
    });

    // Reschedule if date changed
    if (updateData.scheduledAt) {
      const jobId = `reminder_${id}`;
      const existingJob = this.cronJobs.get(jobId);
      if (existingJob) {
        existingJob.stop();
        this.cronJobs.delete(jobId);
      }

      if (reminder.isActive) {
        const cronExpression = `${reminder.scheduledAt.getMinutes()} ${reminder.scheduledAt.getHours()} ${reminder.scheduledAt.getDate()} ${reminder.scheduledAt.getMonth() + 1} *`;
        const job = cron.schedule(cronExpression, async () => {
          await createAndEmitNotification(
            reminder.userId,
            `Recordatorio: ${reminder.title}${reminder.description ? ' - ' + reminder.description : ''}`,
            'custom_reminder',
            reminder.relatedId || undefined,
            reminder.relatedType || undefined
          );
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { isActive: false },
          });
          this.cronJobs.delete(jobId);
        });
        this.cronJobs.set(jobId, job);
      }
    }

    return reminder;
  }

  public async deleteReminder(id: number): Promise<void> {
    // Cancel the cron job
    const jobId = `reminder_${id}`;
    const job = this.cronJobs.get(jobId);
    if (job) {
      job.stop();
      this.cronJobs.delete(jobId);
    }

    await prisma.reminder.delete({
      where: { id },
    });
  }
}
