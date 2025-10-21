import { PrismaClient } from '../generated/prisma';
import { createAndEmitNotification } from '../controller/notificationController';

const prisma = new PrismaClient();

// Servicio de programación de notificaciones avanzadas
export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  // Iniciar el servicio de programación
  public start(): void {
    if (this.isRunning) {
      console.log('Notification scheduler ya está ejecutándose');
      return;
    }

    console.log('Iniciando servicio de programación de notificaciones');
    this.isRunning = true;

    // Verificar cada minuto
    this.intervalId = setInterval(() => {
      this.checkScheduledNotifications();
    }, 60000); // 1 minuto

    // Verificar inmediatamente al iniciar
    this.checkScheduledNotifications();
  }

  // Detener el servicio
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Servicio de programación de notificaciones detenido');
  }

  // Verificar notificaciones programadas pendientes
  private async checkScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();

      // Nota: Esta implementación asume que se agregarán campos scheduledAt e isScheduled
      // a la tabla de notificaciones en el futuro. Por ahora, es un placeholder.

      // En una implementación real, buscaríamos notificaciones con:
      // - isScheduled: true
      // - scheduledAt <= now
      // - status: 'pending' (campo adicional)

      // Ejemplo de lógica futura:
      /*
      const scheduledNotifications = await prisma.notification.findMany({
        where: {
          isScheduled: true,
          scheduledAt: {
            lte: now,
          },
          status: 'pending', // Campo adicional
        },
      });

      for (const notification of scheduledNotifications) {
        // Emitir la notificación
        await this.emitScheduledNotification(notification);

        // Marcar como enviada
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'sent',
            sentAt: now,
          },
        });
      }
      */

      console.log(`Verificación de notificaciones programadas completada - ${now.toISOString()}`);
    } catch (error) {
      console.error('Error verificando notificaciones programadas:', error);
    }
  }

  // Emitir notificación programada
  private async emitScheduledNotification(notification: any): Promise<void> {
    try {
      // Re-emitir la notificación usando el helper existente
      await createAndEmitNotification(
        notification.userId,
        notification.message,
        notification.type,
        notification.relatedId,
        notification.relatedType
      );
    } catch (error) {
      console.error('Error emitiendo notificación programada:', error);
    }
  }

  // Programar notificación para el futuro
  public async scheduleNotification(
    userId: number,
    message: string,
    type: string,
    scheduledAt: Date,
    relatedId?: number,
    relatedType?: string
  ): Promise<void> {
    // En implementación real, crearíamos la notificación con campos adicionales
    console.log(`Notificación programada para ${userId} en ${scheduledAt.toISOString()}`);
  }

  // Obtener estado del servicio
  public getStatus(): { isRunning: boolean; nextCheck?: Date } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.intervalId ? new Date(Date.now() + 60000) : undefined,
    } as { isRunning: boolean; nextCheck?: Date };
  }
}

// Función para inicializar el scheduler
export const initializeNotificationScheduler = (): void => {
  const scheduler = NotificationScheduler.getInstance();
  scheduler.start();
};

// Función para detener el scheduler
export const stopNotificationScheduler = (): void => {
  const scheduler = NotificationScheduler.getInstance();
  scheduler.stop();
};
