import { RequestHandler } from 'express';
import { AuthUser } from '../types/auth';
import projectService from '../service/projectService';
import { projectSchema } from '../model/Project/projectModel';
import { createAndEmitNotification } from './notificationController';
import { CalendarService } from '../service/calendarService';

export const createProject: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    if (!user.role || user.role.toUpperCase() !== 'TUTOR') {
      return res.status(403).json({ message: 'Solo los tutores pueden crear proyectos.' });
    }
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

        // Sincronizar proyecto con Google Calendar para cada participante
        // Sincronizar si hay endDate o startDate (similar a tareas que sincronizan con dueDate)
        if (project.endDate || project.startDate) {
          try {
            const calendarService = CalendarService.getInstance();
            await calendarService.syncProjectToCalendar(project.id, participantId);
            console.log(`Proyecto sincronizado con Google Calendar para el participante ${participantId}`);
          } catch (error: any) {
            console.error(`Error sincronizando proyecto con calendario para participante ${participantId}:`, error);
            if (error && (error.code === 'INSUFFICIENT_PERMISSIONS' || error.message?.includes('Insufficient'))) {
              console.warn(`Permisos insuficientes de Google Calendar para el participante ${participantId}. El proyecto no se sincronizó.`);
            } else {
              console.warn(`Error de sincronización de calendario para el participante ${participantId}: ${error.message}`);
            }
            // No fallamos la creación del proyecto si falla la sincronización del calendario
          }
        } else {
          console.log(`Proyecto ${project.name} no tiene fecha de inicio ni fin, no se sincroniza con calendario`);
        }
      }
    }
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const getProjects: RequestHandler = async (req, res, next) => {
  try {
    let projects = await projectService.getAll();
    const user = req.user as AuthUser;
    if (user && 'role' in user) {
      if (user.role && user.role.toUpperCase() === 'TUTOR') {
        projects = projects.filter(p => p.tutorId === user.id);
      } else if (user.role && user.role.toUpperCase() === 'ALUMNO') {
        // Solo proyectos donde el alumno es participante
        projects = projects.filter(p => Array.isArray(p.participants) && p.participants.some((u: {id:number}) => u.id === user.id));
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

export const updateProject: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    const id = Number(req.params.id);
    const project = await projectService.getById(id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    if (project.tutorId !== user.id) {
      return res.status(403).json({ message: 'Solo el tutor puede actualizar el proyecto.' });
    }
    const data = req.body;
    // Asegurarse de que el tutor no se elimine y no se añada a sí mismo como participante
    const participants = Array.isArray(data.participants)
      ? data.participants.filter((participantId: number) => participantId !== user.id)
      : [];

    const updatedProject = await projectService.update(id, { ...data, participants });
    res.json(updatedProject);
  } catch (error) {
    next(error);
  }
};

export const deleteProject: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    const id = Number(req.params.id);
    const project = await projectService.getById(id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    if (project.tutorId !== user.id) {
      return res.status(403).json({ message: 'Solo el tutor puede eliminar el proyecto.' });
    }

    // Eliminar eventos de calendario para todos los participantes
    if (project.googleEventId) {
      try {
        const calendarService = CalendarService.getInstance();
        // Obtener todos los participantes del proyecto
        const participants = project.participants || [];
        for (const participant of participants) {
          try {
            await calendarService.deleteEvent(participant.id, project.googleEventId);
            console.log(`Evento de calendario eliminado para el participante ${participant.username}`);
          } catch (error: any) {
            console.warn(`Error eliminando evento de calendario para participante ${participant.username}:`, error.message);
            // No fallar la eliminación del proyecto si falla la eliminación del calendario
          }
        }
      } catch (error: any) {
        console.warn('Error eliminando eventos de calendario del proyecto:', error.message);
        // No fallar la eliminación del proyecto si falla la eliminación del calendario
      }
    }

    await projectService.delete(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
