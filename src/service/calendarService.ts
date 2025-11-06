import { google } from 'googleapis';
import { getServiceAccountAuth, getUserAuth } from '../config/googleAuth';
import prisma from '../config/database';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

export class CalendarService {
  private static instance: CalendarService;

  private constructor() {}

  public static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  // Crear evento en calendario usando cuenta de servicio
  async createEventWithServiceAccount(
    calendarId: string,
    event: CalendarEvent
  ) {
    try {
      const auth = getServiceAccountAuth();
      const calendar = google.calendar({ version: 'v3', auth });

      const res = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      return res.data;
    } catch (error) {
      console.error('Error creating event with service account:', error);
      throw error;
    }
  }

  // Crear evento en calendario usando tokens de usuario
  async createEventWithUserToken(
    userId: number,
    event: CalendarEvent,
    calendarId: string = 'primary'
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true,
          googleTokenExpiry: true,
          calendarId: true,
        },
      });

      if (!user?.googleAccessToken) {
        throw new Error('User not authenticated with Google');
      }

      // Verificar si el token expiró
      if (user.googleTokenExpiry && new Date() > user.googleTokenExpiry) {
        // Refrescar token
        const { refreshAccessToken } = await import('../config/googleAuth');
        const newCredentials = await refreshAccessToken(user.googleRefreshToken!);

        // Actualizar en BD
        await prisma.user.update({
          where: { id: userId },
          data: {
            googleAccessToken: newCredentials.access_token!,
            googleTokenExpiry: newCredentials.expiry_date
              ? new Date(newCredentials.expiry_date)
              : undefined,
          },
        });

        user.googleAccessToken = newCredentials.access_token!;
      }

      const auth = getUserAuth(user.googleAccessToken!, user.googleRefreshToken || undefined);
      const calendar = google.calendar({ version: 'v3', auth });

      const targetCalendarId = user.calendarId || calendarId;

      const res = await calendar.events.insert({
        calendarId: targetCalendarId,
        requestBody: event,
      });

      return res.data;
    } catch (error) {
      // Detectar error de permisos insuficientes y lanzar error con código claro
      // Estructura esperada: error.response.data.error.errors -> [{ reason: 'insufficientPermissions', ... }]
      try {
        const anyErr: any = error;
        const reason = anyErr?.response?.data?.error?.errors?.[0]?.reason;
        if (reason === 'insufficientPermissions' || anyErr?.response?.status === 403) {
          const err = new Error('Insufficient Google Calendar permissions');
          // @ts-ignore añadir propiedad personalizada
          (err as any).code = 'INSUFFICIENT_PERMISSIONS';
          throw err;
        }
      } catch (inner) {
        // si falla la inspección, continuar hacia el throw general abajo
      }

      console.error('Error creating event with user token:', error);
      throw error;
    }
  }

  // Sincronizar tarea con calendario
  async syncTaskToCalendar(taskId: number, userId: number) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          responsible: true,
          project: true,
          tutor: true,
        },
      });

      if (!task) throw new Error('Task not found');

      if (!task.dueDate) {
        throw new Error('Task has no due date');
      }

      const dueDate = new Date(task.dueDate);
      const startDateTime = dueDate.toISOString();
      const endDateTime = new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(); // 1 hora después

      const event: CalendarEvent = {
        summary: `Entrega: ${task.name}`,
        description: `Tarea: ${task.description || 'Sin descripción'}\nEstudiante: ${task.responsible?.username || 'Sin asignar'}\nTutor: ${task.tutor?.username || 'Sin tutor'}\nEnlace: http://localhost:8000/tasks/${task.id}`,
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Bogota', // Ajusta según tu zona horaria
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Bogota',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 }, // 24 horas antes
            { method: 'popup', minutes: 60 },   // 1 hora antes
          ],
        },
      };

      const createdEvent = await this.createEventWithUserToken(userId, event);

      // Almacenar el ID del evento en la base de datos
      await prisma.task.update({
        where: { id: taskId },
        data: { googleEventId: createdEvent.id },
      });

      return createdEvent;
    } catch (error) {
      console.error('Error syncing task to calendar:', error);
      throw error;
    }
  }

  // Sincronizar proyecto con calendario
  async syncProjectToCalendar(projectId: number, userId: number) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          participants: true,
          tutor: true,
        },
      });

      if (!project) throw new Error('Project not found');

      let event: CalendarEvent;

      if (project.startDate && project.endDate) {
        // Proyecto con período completo: crear evento de todo el día que abarque desde startDate hasta endDate
        const startDate = new Date(project.startDate);
        const endDate = new Date(project.endDate);

        // Para eventos de todo el día, Google Calendar usa formato YYYY-MM-DD
        // La fecha final es exclusiva (el evento termina al inicio del día siguiente)
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +1 día

        event = {
          summary: `Proyecto: ${project.name}`,
          description: `Proyecto: ${project.description || 'Sin descripción'}\nTutor: ${project.tutor?.username || 'Sin tutor'}\nParticipantes: ${project.participants.map(p => p.username).join(', ')}\nPeríodo: ${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}\nEnlace: http://localhost:8000/projects/${project.id}`,
          start: {
            date: startDateStr,
            timeZone: 'America/Bogota',
          },
          end: {
            date: endDateStr,
            timeZone: 'America/Bogota',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 2880 }, // 48 horas antes del fin
              { method: 'popup', minutes: 1440 }, // 24 horas antes del fin
            ],
          },
        };
      } else {
        // Proyecto con una sola fecha: usar la lógica anterior
        const referenceDate = project.endDate ? new Date(project.endDate) : (project.startDate ? new Date(project.startDate) : null);

        if (!referenceDate) {
          throw new Error('Project has no start or end date');
        }

        const startDateTime = referenceDate.toISOString();
        const endDateTime = new Date(referenceDate.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 horas

        event = {
          summary: `Proyecto: ${project.name}`,
          description: `Proyecto: ${project.description || 'Sin descripción'}\nTutor: ${project.tutor?.username || 'Sin tutor'}\nParticipantes: ${project.participants.map(p => p.username).join(', ')}\n${project.endDate ? 'Fecha de entrega' : 'Fecha de inicio'}: ${referenceDate.toLocaleDateString('es-ES')}\nEnlace: http://localhost:8000/projects/${project.id}`,
          start: {
            dateTime: startDateTime,
            timeZone: 'America/Bogota',
          },
          end: {
            dateTime: endDateTime,
            timeZone: 'America/Bogota',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 2880 }, // 48 horas antes
              { method: 'popup', minutes: 1440 }, // 24 horas antes
            ],
          },
        };
      }

      const createdEvent = await this.createEventWithUserToken(userId, event);

      // Almacenar el ID del evento en la base de datos
      await prisma.project.update({
        where: { id: projectId },
        data: { googleEventId: createdEvent.id },
      });

      return createdEvent;
    } catch (error) {
      console.error('Error syncing project to calendar:', error);
      throw error;
    }
  }

  // Sincronizar examen con calendario
  async syncExamToCalendar(examId: number, userId: number) {
    try {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: {
          createdByUser: true,
        },
      });

      if (!exam) throw new Error('Exam not found');

      // Para exámenes, asumimos que la fecha límite está en el título o descripción
      // Puedes ajustar esto según cómo guardes las fechas de exámenes
      const now = new Date();
      const examDateTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Ejemplo: 7 días desde ahora
      const startDateTime = examDateTime.toISOString();
      const endDateTime = new Date(examDateTime.getTime() + exam.timeLimit * 60 * 1000).toISOString();

      const event: CalendarEvent = {
        summary: `Examen: ${exam.title}`,
        description: `Examen: ${exam.title}\nTiempo límite: ${exam.timeLimit} minutos\nCreado por: ${exam.createdByUser.username}\nEnlace: http://localhost:8000/exams/${exam.id}`,
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Bogota',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Bogota',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 }, // 24 horas antes
            { method: 'popup', minutes: 60 },   // 1 hora antes
          ],
        },
      };

      return await this.createEventWithUserToken(userId, event);
    } catch (error) {
      console.error('Error syncing exam to calendar:', error);
      throw error;
    }
  }

  // Obtener eventos del calendario
  async getCalendarEvents(
    userId: number,
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true,
          googleTokenExpiry: true,
          calendarId: true,
        },
      });

      if (!user?.googleAccessToken) {
        throw new Error('User not authenticated with Google');
      }

      const auth = getUserAuth(user.googleAccessToken, user.googleRefreshToken || undefined);
      const calendar = google.calendar({ version: 'v3', auth });

      const targetCalendarId = user.calendarId || calendarId;

      const res = await calendar.events.list({
        calendarId: targetCalendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return res.data.items || [];
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw error;
    }
  }

  // Actualizar evento
  async updateEvent(
    userId: number,
    eventId: string,
    updates: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true,
          calendarId: true,
        },
      });

      if (!user?.googleAccessToken) {
        throw new Error('User not authenticated with Google');
      }

      const auth = getUserAuth(user.googleAccessToken, user.googleRefreshToken || undefined);
      const calendar = google.calendar({ version: 'v3', auth });

      const targetCalendarId = user.calendarId || calendarId;

      const res = await calendar.events.update({
        calendarId: targetCalendarId,
        eventId,
        requestBody: updates,
      });

      return res.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  // Eliminar evento
  async deleteEvent(
    userId: number,
    eventId: string,
    calendarId: string = 'primary'
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true,
          calendarId: true,
        },
      });

      if (!user?.googleAccessToken) {
        throw new Error('User not authenticated with Google');
      }

      const auth = getUserAuth(user.googleAccessToken, user.googleRefreshToken || undefined);
      const calendar = google.calendar({ version: 'v3', auth });

      const targetCalendarId = user.calendarId || calendarId;

      await calendar.events.delete({
        calendarId: targetCalendarId,
        eventId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }
}
