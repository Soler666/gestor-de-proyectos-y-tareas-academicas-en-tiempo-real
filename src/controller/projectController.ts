import { RequestHandler, Request } from 'express';
import projectService from '../service/projectService';
import { projectSchema } from '../model/Project/projectModel';
import { createAndEmitNotification } from './notificationController';

interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export const createProject: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    if (req.user.role !== 'Tutor') {
      return res.status(403).json({ message: 'Solo los tutores pueden crear proyectos.' });
    }
    const user = req.user;
    let data = req.body;
    data = { ...data, tutorId: user.id };
    // Eliminar al tutor de la lista de participantes si está incluido
    let participants = Array.isArray(data.participants) ? data.participants.filter((id: number) => id !== user.id) : [];
    const parsed = projectSchema.parse({ ...data, participants });
    const project = await projectService.create(parsed);
    // Send notifications to all participants
    if (participants && participants.length > 0) {
      for (const participantId of participants) {
        await createAndEmitNotification(
          participantId,
          `Has sido asignado al proyecto: ${project.name}`,
          'project_assigned',
          project.id,
          'project'
        );
      }
    }
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const getProjects: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    let projects = await projectService.getAll();
    if (req.user && 'role' in req.user) {
      if (req.user.role === 'Tutor') {
        // Solo proyectos creados por el tutor
        projects = projects.filter(p => p.tutorId === req.user!.id);
      } else if (req.user.role === 'Alumno') {
        // Solo proyectos donde el alumno es participante
        projects = projects.filter(p => Array.isArray(p.participants) && p.participants.some((u: {id:number}) => u.id === req.user!.id));
      } else {
        // Otros roles (admin, etc) no ven nada
        projects = [];
      }
    } else {
      projects = [];
    }
    res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const project = await projectService.getById(id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    res.json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    const id = Number(req.params.id);
    const project = await projectService.getById(id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    if (project.tutorId !== req.user.id) {
      return res.status(403).json({ message: 'Solo el tutor puede actualizar el proyecto.' });
    }
    const data = req.body;
    // Asegurarse de que el tutor no se elimine y no se añada a sí mismo como participante
    const participants = Array.isArray(data.participants) 
      ? data.participants.filter((participantId: number) => participantId !== req.user!.id) 
      : [];

    const updatedProject = await projectService.update(id, { ...data, participants });
    res.json(updatedProject);
  } catch (error) {
    next(error);
  }
};

export const deleteProject: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    const id = Number(req.params.id);
    const project = await projectService.getById(id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    if (project.tutorId !== req.user.id) {
      return res.status(403).json({ message: 'Solo el tutor puede eliminar el proyecto.' });
    }
    await projectService.delete(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
