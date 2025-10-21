import prisma from '../config/database';

export interface ActivityLogEntry {
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  details?: string;
  oldValues?: any;
  newValues?: any;
}

export class ActivityLogService {
  private static instance: ActivityLogService;

  private constructor() {}

  public static getInstance(): ActivityLogService {
    if (!ActivityLogService.instance) {
      ActivityLogService.instance = new ActivityLogService();
    }
    return ActivityLogService.instance;
  }

  // Registrar una actividad
  public async logActivity(entry: ActivityLogEntry): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          details: entry.details || null,
          oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
        },
      });
    } catch (error) {
      console.error('Error logging activity:', error);
      // No lanzamos error para no interrumpir el flujo principal
    }
  }

  // Obtener historial de actividades con filtros
  public async getActivityHistory(
    userId?: number,
    entityType?: string,
    entityId?: number,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const where: any = {};

    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return activities.map(activity => ({
      id: activity.id,
      user: activity.user,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      details: activity.details,
      oldValues: activity.oldValues ? JSON.parse(activity.oldValues) : null,
      newValues: activity.newValues ? JSON.parse(activity.newValues) : null,
      timestamp: activity.timestamp,
    }));
  }

  // Métodos específicos para tipos de actividades comunes
  public async logTaskCreation(userId: number, taskId: number, taskData: any): Promise<void> {
    await this.logActivity({
      userId,
      action: 'CREATE',
      entityType: 'TASK',
      entityId: taskId,
      details: `Tarea "${taskData.name}" creada`,
      newValues: taskData,
    });
  }

  public async logTaskUpdate(userId: number, taskId: number, oldData: any, newData: any): Promise<void> {
    await this.logActivity({
      userId,
      action: 'UPDATE',
      entityType: 'TASK',
      entityId: taskId,
      details: `Tarea actualizada`,
      oldValues: oldData,
      newValues: newData,
    });
  }

  public async logTaskDeletion(userId: number, taskId: number, taskData: any): Promise<void> {
    await this.logActivity({
      userId,
      action: 'DELETE',
      entityType: 'TASK',
      entityId: taskId,
      details: `Tarea "${taskData.name}" eliminada`,
      oldValues: taskData,
    });
  }

  public async logProjectCreation(userId: number, projectId: number, projectData: any): Promise<void> {
    await this.logActivity({
      userId,
      action: 'CREATE',
      entityType: 'PROJECT',
      entityId: projectId,
      details: `Proyecto "${projectData.name}" creado`,
      newValues: projectData,
    });
  }

  public async logProjectUpdate(userId: number, projectId: number, oldData: any, newData: any): Promise<void> {
    await this.logActivity({
      userId,
      action: 'UPDATE',
      entityType: 'PROJECT',
      entityId: projectId,
      details: `Proyecto actualizado`,
      oldValues: oldData,
      newValues: newData,
    });
  }

  public async logStatusChange(userId: number, entityType: string, entityId: number, oldStatus: string, newStatus: string, entityName: string): Promise<void> {
    await this.logActivity({
      userId,
      action: 'STATUS_CHANGE',
      entityType,
      entityId,
      details: `Estado de ${entityType.toLowerCase()} "${entityName}" cambió de "${oldStatus}" a "${newStatus}"`,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
    });
  }

  public async logAssignment(userId: number, entityType: string, entityId: number, assignedTo: number, entityName: string): Promise<void> {
    await this.logActivity({
      userId,
      action: 'ASSIGN',
      entityType,
      entityId,
      details: `${entityType.toLowerCase()} "${entityName}" asignada`,
      newValues: { assignedTo },
    });
  }

  public async logChatMessage(userId: number, messageId: number, recipientId?: number): Promise<void> {
    await this.logActivity({
      userId,
      action: recipientId ? 'PRIVATE_MESSAGE' : 'PUBLIC_MESSAGE',
      entityType: 'CHAT_MESSAGE',
      entityId: messageId,
      details: recipientId ? 'Mensaje privado enviado' : 'Mensaje público enviado',
    });
  }
}
