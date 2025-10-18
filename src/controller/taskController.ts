import { RequestHandler, Request } from 'express';
import taskService from '../service/taskService';
import { taskSchema } from '../model/Task/taskModel';
import { getIO } from '../config/socket';
import { createAndEmitNotification } from './notificationController';

interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export const createTask: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    const user = req.user;
    if (!user || typeof user.role !== 'string') {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    if (user.role.toLowerCase() !== 'tutor') {
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

    
    if (task.responsibleId) {
      await createAndEmitNotification(
        task.responsibleId,
        `Se te ha asignado una nueva tarea: ${task.name}`,
        'task_assigned',
        task.id,
        'task'
      );

      getIO().to(`user_${task.responsibleId}`).emit('task-created', task);
    }
    res.status(201).json(task);
  } catch (error) {
    console.log('Error en createTask:', error);
    next(error);
  }
};

export const getTasks: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    const allTasks = await taskService.getAll();

    // Si el usuario es tutor, agrupar tareas "lógicas" que fueron creadas una por cada alumno
    // y devolver una sola entrada con la lista de responsables y su estado.
    if (req.user && 'role' in req.user && req.user.role.toLowerCase() === 'tutor') {
      const tutorId = req.user.id;
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

export const getTaskById: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const task = await taskService.getById(id);
    if (!task) return res.status(404).json({ message: 'Tarea no encontrada' });

    if (req.user && 'role' in req.user && req.user.role.toLowerCase() === 'tutor') {
      const allTasks = await taskService.getAll();
      const key = `${task.name}::${task.description ?? ''}::${task.dueDate ? new Date(task.dueDate).toISOString() : ''}::${task.projectId ?? ''}::${task.priority ?? ''}::${task.type ?? ''}`;
      const sameGroup = allTasks.filter(t => {
        const k = `${t.name}::${t.description ?? ''}::${t.dueDate ? new Date(t.dueDate).toISOString() : ''}::${t.projectId ?? ''}::${t.priority ?? ''}::${t.type ?? ''}`;
        return k === key && t.tutorId === req.user!.id;
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

export const updateTask: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    const id = Number(req.params.id);
    const task = await taskService.getById(id);
    if (!task) return res.status(404).json({ message: 'Tarea no encontrada' });

    // Solo el tutor puede actualizar tareas
    if (req.user.role.toLowerCase() !== 'tutor') {
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

export const deleteTask: RequestHandler = async (req: CustomRequest, res, next) => {
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
