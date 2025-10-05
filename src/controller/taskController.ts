import { RequestHandler, Request } from 'express';
import taskService from '../service/taskService';
import { taskSchema } from '../model/Task/taskModel';

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
    if (user.role !== 'Tutor') {
      return res.status(403).json({ message: 'Solo los tutores pueden crear tareas.' });
    }
    let data = req.body;
    data.tutorId = user.id; // Asignar tutorId al usuario autenticado
    console.log('Data received:', data);
    const parsed = taskSchema.parse(data);
    const task = await taskService.create(parsed);
    res.status(201).json(task);
  } catch (error) {
    console.log('Error en createTask:', error);
    next(error);
  }
};
export const getTasks: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    let tasks;
    if (req.user && 'role' in req.user && req.user.role === 'Tutor') {
      // Filtrar solo las tareas donde el usuario es el tutor que las creó
      tasks = (await taskService.getAll()).filter(t => t.tutorId === req.user?.id);
    } else {
      // Filtrar solo las tareas donde el usuario es responsable
      tasks = (await taskService.getAll()).filter(t => t.responsibleId === req.user?.id);
    }
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
    if (req.user.role !== 'Tutor') {
      return res.status(403).json({ message: 'Solo los tutores pueden actualizar tareas.' });
    }

    const data = req.body;
    const updatedTask = await taskService.update(id, data);
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
};

export const deleteTask: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    await taskService.delete(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
