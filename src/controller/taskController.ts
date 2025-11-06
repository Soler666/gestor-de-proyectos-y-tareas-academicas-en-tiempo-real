import { RequestHandler, Request } from 'express';
import taskService from '../service/taskService';
import { taskSchema } from '../model/Task/taskModel';
import { getIO } from '../config/socket';
import { createAndEmitNotification } from './notificationController';
import { AuthUser } from '../types/auth';
import { CalendarService } from '../service/calendarService';
export const createTask: RequestHandler = async (req: any, res, next) => {
  try {
    const user = req.user as AuthUser;
    console.log('Intento de crear tarea. Usuario:', {
      id: user?.id,
      username: user?.username,
      role: user?.role,
      roleType: typeof user?.role
    });
    
    if (!user || typeof user.role !== 'string') {
      console.log('Usuario no autenticado o rol inválido');
      return res.status(403).json({ message: 'No autenticado.' });
    }
    
    const normalizedRole = user.role.toUpperCase();
    console.log('Rol normalizado:', normalizedRole);
    
    if (normalizedRole !== 'TUTOR') {
      console.log('Acceso denegado. Rol actual:', normalizedRole);
      return res.status(403).json({ message: 'Solo los tutores pueden crear tareas.' });
    }

    let data = req.body;
    data.tutorId = user.id; // Asignar tutorId al usuario autenticado
    console.log('Data received:', data);
    const parsed = taskSchema.parse(data);
    const createdTask = await taskService.create(parsed);
    const task = await taskService.getById(createdTask.id);

    if (!task) {
      return res.status(404).json({ message: 'Error al recuperar la tarea creada.' });
    }
    
    let calendarWarning: string | undefined = undefined;

    if (task.responsibleId) {
      await createAndEmitNotification(
        task.responsibleId,
        `Se te ha asignado una nueva tarea: ${task.name}`,
        'task_assigned',
        task.id,
        'task'
      );

      getIO().to(`user_${task.responsibleId}`).emit('task-created', task);

  // Sincronizar con Google Calendar si hay fecha límite
        if (task.dueDate) {
          try {
            const calendarService = CalendarService.getInstance();
            await calendarService.syncTaskToCalendar(task.id, task.responsibleId);
            console.log('Tarea sincronizada con Google Calendar');
          } catch (error: any) {
            console.error('Error sincronizando tarea con calendario:', error);
            if (error && (error.code === 'INSUFFICIENT_PERMISSIONS' || error.message?.includes('Insufficient'))) {
              calendarWarning = 'El alumno no ha otorgado permisos de Google Calendar. Pídele que vuelva a iniciar sesión con Google para activar sincronización.';
            } else {
              calendarWarning = 'No fue posible sincronizar la tarea con el calendario del alumno.';
            }
            // No fallamos la creación de la tarea si falla la sincronización del calendario
          }
        }
      }
      // Responder con la tarea y posible advertencia sobre calendar
      const responseBody: any = { task };
      if (typeof calendarWarning !== 'undefined') {
        responseBody.calendarWarning = calendarWarning;
        // Añadir código de advertencia para que el frontend lo detecte fácilmente
        if (calendarWarning.includes('permisos')) {
          responseBody.calendarWarningCode = 'INSUFFICIENT_PERMISSIONS';
        } else {
          responseBody.calendarWarningCode = 'CALENDAR_SYNC_FAILED';
        }
      }
      res.status(201).json(responseBody);
  } catch (error) {
    console.log('Error en createTask:', error);
    next(error);
  }
};

export const getTasks: RequestHandler = async (req: any, res, next) => {
  try {
    const allTasks = await taskService.getAll();

    // Si el usuario es tutor, agrupar tareas "lógicas" que fueron creadas una por cada alumno
    // y devolver una sola entrada con la lista de responsables y su estado.
    if (req.user && 'role' in req.user && req.user.role.toLowerCase() === 'tutor') {
      const user = req.user as AuthUser;
      const tutorId = user.id;
      const tutorTasks = allTasks.filter(t => t.tutorId === tutorId);

      // Agrupar por una "huella" de la tarea (nombre, descripción, fecha, proyecto, prioridad, tipo)
      const grouped = new Map<string, any>();

      for (const t of tutorTasks) {
        const key = `${t.name}::${t.description ?? ''}::${t.dueDate ? new Date(t.dueDate).toISOString() : ''}::${t.projectId ?? ''}::${t.priority ?? ''}::${t.type ?? ''}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: t.id,
            name: t.name,
            description: t.description,
            dueDate: t.dueDate,
            priority: t.priority,
            status: t.status,
            type: t.type,
            project: t.project,
            tutor: t.tutor,
            // responsibles: lista de alumnos con su id, username y estado de la tarea para cada uno
            responsibles: [],
          });
        }
        const entry = grouped.get(key);
        entry.responsibles.push({ id: t.responsibleId, username: t.responsible?.username, status: t.status });

        // Ajustar estado agregado: si alguno está Pendiente, marcar pendiente; else si alguno En progreso -> En progreso; else Completada
        if (entry.status !== 'Pendiente') {
          if (t.status === 'Pendiente') entry.status = 'Pendiente';
          else if (entry.status !== 'En progreso' && t.status === 'En progreso') entry.status = 'En progreso';
        }
      }

      return res.json(Array.from(grouped.values()));
    }

    // Para alumnos u otros roles, mantener comportamiento actual (filtrar por responsable o tareas sin responsable)
    const tasks = allTasks.filter(t => t.responsibleId === req.user?.id || t.responsibleId === null);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById: RequestHandler = async (req: any, res, next) => {
  try {
    const id = Number(req.params.id);
    const task = await taskService.getById(id);
    if (!task) return res.status(404).json({ message: 'Tarea no encontrada' });

    if (req.user && 'role' in req.user && req.user.role.toLowerCase() === 'tutor') {
      const allTasks = await taskService.getAll();
      const key = `${task.name}::${task.description ?? ''}::${task.dueDate ? new Date(task.dueDate).toISOString() : ''}::${task.projectId ?? ''}::${task.priority ?? ''}::${task.type ?? ''}`;
      const sameGroup = allTasks.filter(t => {
        const k = `${t.name}::${t.description ?? ''}::${t.dueDate ? new Date(t.dueDate).toISOString() : ''}::${t.projectId ?? ''}::${t.priority ?? ''}::${t.type ?? ''}`;
        const user = req.user as AuthUser;
        return k === key && t.tutorId === user.id;
      });

      const aggregated = {
        id: task.id,
        name: task.name,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        type: task.type,
        project: task.project,
        tutor: task.tutor,
        responsibles: sameGroup.map(t => ({ id: t.responsibleId, username: t.responsible?.username, status: t.status })),
      };

      return res.json(aggregated);
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask: RequestHandler = async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    const id = Number(req.params.id);
    const task = await taskService.getById(id);
    if (!task) return res.status(404).json({ message: 'Tarea no encontrada' });

    // Solo el tutor puede actualizar tareas
    const user = req.user as AuthUser;
    if (user.role.toLowerCase() !== 'tutor') {
      return res.status(403).json({ message: 'Solo los tutores pueden actualizar tareas.' });
    }

    const data = req.body;
    const updatedTask = await taskService.update(id, data);
    const taskWithRelations = await taskService.getById(updatedTask.id);

    if (taskWithRelations && taskWithRelations.responsibleId) {
      await createAndEmitNotification(
        taskWithRelations.responsibleId,
        `La tarea '${taskWithRelations.name}' ha sido actualizada.`,
        'task_updated',
        taskWithRelations.id,
        'task'
      );
      getIO().to(`user_${taskWithRelations.responsibleId}`).emit('task-updated', taskWithRelations);
    }

    res.json(taskWithRelations);
  } catch (error) {
    next(error);
  }
};

export const deleteTask: RequestHandler = async (req: any, res, next) => {
  try {
    const id = Number(req.params.id);
    const taskToDelete = await taskService.getById(id); // Obtener la tarea antes de eliminarla

    if (!taskToDelete) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    await taskService.delete(id);

    if (taskToDelete.responsibleId) {
      await createAndEmitNotification(
        taskToDelete.responsibleId,
        `La tarea '${taskToDelete.name}' ha sido eliminada.`,
        'task_deleted',
        taskToDelete.id,
        'task'
      );
      getIO().to(`user_${taskToDelete.responsibleId}`).emit('task-deleted', taskToDelete.id);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
