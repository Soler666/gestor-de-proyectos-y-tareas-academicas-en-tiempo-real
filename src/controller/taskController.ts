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
    
    // Determinar lista de responsables
    let responsibleIds: number[] = [];
    if (data.responsibleIds && Array.isArray(data.responsibleIds) && data.responsibleIds.length > 0) {
      responsibleIds = data.responsibleIds;
    } else if (data.responsibleId) {
      responsibleIds = [data.responsibleId];
    } else {
      return res.status(400).json({ message: 'Debe especificar al menos un alumno responsable.' });
    }

    const createdTasks: any[] = [];
    const calendarWarnings: string[] = [];

    // Crear una tarea por cada alumno responsable
    for (const responsibleId of responsibleIds) {
      const taskData = {
        ...data,
        responsibleId,
        responsibleIds: undefined, // Eliminar el array para el schema individual
      };
      
      const parsed = taskSchema.parse(taskData);
      const createdTask = await taskService.create(parsed);
      const task = await taskService.getById(createdTask.id);

      if (!task) {
        console.error(`Error al recuperar la tarea creada para responsibleId: ${responsibleId}`);
        continue;
      }

      createdTasks.push(task);

      // Notificar al alumno
      await createAndEmitNotification(
        responsibleId,
        `Se te ha asignado una nueva tarea: ${task.name}`,
        'task_assigned',
        task.id,
        'task'
      );

      getIO().to(`user_${responsibleId}`).emit('task-created', task);

      // Sincronizar con Google Calendar si hay fecha límite
      if (task.dueDate) {
        try {
          const calendarService = CalendarService.getInstance();
          await calendarService.syncTaskToCalendar(task.id, responsibleId);
          console.log(`Tarea sincronizada con Google Calendar para alumno ${responsibleId}`);
        } catch (error: any) {
          console.error(`Error sincronizando tarea con calendario para alumno ${responsibleId}:`, error);
          // Detectar si el alumno no ha autenticado con Google o no tiene permisos
          if (error && (
            error.code === 'INSUFFICIENT_PERMISSIONS' || 
            error.message?.includes('Insufficient') ||
            error.message?.includes('not authenticated with Google')
          )) {
            calendarWarnings.push(`Alumno ID ${responsibleId}: sin permisos de Google Calendar`);
          } else {
            calendarWarnings.push(`Alumno ID ${responsibleId}: error de sincronización`);
          }
        }
      }
    }

    // Responder con las tareas creadas y posibles advertencias
    const responseBody: any = { 
      tasks: createdTasks,
      count: createdTasks.length 
    };
    
    if (calendarWarnings.length > 0) {
      responseBody.calendarWarning = `Algunas tareas no se sincronizaron con Google Calendar: ${calendarWarnings.join(', ')}`;
      responseBody.calendarWarningCode = 'CALENDAR_SYNC_PARTIAL';
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
      // Normalizamos los valores para asegurar un agrupamiento correcto
      const grouped = new Map<string, any>();

      for (const t of tutorTasks) {
        // Normalizar fecha a formato ISO sin milisegundos
        const normalizedDate = t.dueDate ? new Date(t.dueDate).toISOString().split('.')[0] : 'null';
        
        // Crear clave única basada en los campos que definen una tarea "lógica"
        const key = [
          t.name?.trim() || '',
          t.description?.trim() || '',
          normalizedDate,
          String(t.projectId ?? 'null'),
          t.priority?.trim() || '',
          t.type?.trim() || ''
        ].join('||');

        if (!grouped.has(key)) {
          grouped.set(key, {
            id: t.id, // Usar el ID de la primera tarea del grupo
            name: t.name,
            description: t.description,
            dueDate: t.dueDate,
            priority: t.priority,
            status: t.status,
            type: t.type,
            project: t.project,
            tutor: t.tutor,
            projectId: t.projectId,
            tutorId: t.tutorId,
            // responsibles: lista de alumnos con su id, username, firstName, lastName y estado de la tarea para cada uno
            responsibles: [],
          });
        }
        
        const entry = grouped.get(key);
        entry.responsibles.push({ 
          id: t.responsibleId, 
          username: t.responsible?.username,
          firstName: t.responsible?.firstName,
          lastName: t.responsible?.lastName,
          status: t.status 
        });

        // Ajustar estado agregado basado en prioridad: Pendiente > En progreso > Completada
        if (entry.status !== 'Pendiente') {
          if (t.status === 'Pendiente') {
            entry.status = 'Pendiente';
          } else if (entry.status !== 'En progreso' && t.status === 'En progreso') {
            entry.status = 'En progreso';
          }
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
      
      // Normalizar fecha igual que en getTasks
      const normalizedDate = task.dueDate ? new Date(task.dueDate).toISOString().split('.')[0] : 'null';
      
      // Crear clave única consistente con getTasks
      const key = [
        task.name?.trim() || '',
        task.description?.trim() || '',
        normalizedDate,
        String(task.projectId ?? 'null'),
        task.priority?.trim() || '',
        task.type?.trim() || ''
      ].join('||');

      const user = req.user as AuthUser;
      const sameGroup = allTasks.filter(t => {
        const tNormalizedDate = t.dueDate ? new Date(t.dueDate).toISOString().split('.')[0] : 'null';
        const k = [
          t.name?.trim() || '',
          t.description?.trim() || '',
          tNormalizedDate,
          String(t.projectId ?? 'null'),
          t.priority?.trim() || '',
          t.type?.trim() || ''
        ].join('||');
        return k === key && t.tutorId === user.id;
      });

      // Determinar el estado agregado
      let aggregatedStatus = 'Completada';
      for (const t of sameGroup) {
        if (t.status === 'Pendiente') {
          aggregatedStatus = 'Pendiente';
          break;
        } else if (t.status === 'En progreso') {
          aggregatedStatus = 'En progreso';
        }
      }

      const aggregated = {
        id: task.id,
        name: task.name,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: aggregatedStatus,
        type: task.type,
        project: task.project,
        tutor: task.tutor,
        projectId: task.projectId,
        tutorId: task.tutorId,
        responsibles: sameGroup.map(t => ({ 
          id: t.responsibleId, 
          username: t.responsible?.username,
          firstName: t.responsible?.firstName,
          lastName: t.responsible?.lastName,
          status: t.status 
        })),
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
