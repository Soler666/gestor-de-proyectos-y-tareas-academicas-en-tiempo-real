import { RequestHandler, Request } from 'express';
import { PrismaClient } from '../generated/prisma';
import { ActivityLogService } from '../service/activityLogService';

const prisma = new PrismaClient();

interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Progreso de alumnos: tareas completadas vs asignadas
export const getStudentProgress: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    // Si es alumno, solo ver su propio progreso
    // Si es tutor, ver todos los alumnos
    const whereClause = req.user.role === 'Tutor' ? {} : { responsibleId: req.user.id };

    const students = await prisma.user.findMany({
      where: {
        role: 'Alumno',
        ...whereClause,
      },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            type: true,
          },
        },
      },
    });

    const progress = students.map(student => {
      const totalTasks = student.tasks.length;
      const completedTasks = student.tasks.filter(task => task.status === 'Completada').length;
      const dailyTasks = student.tasks.filter(task => task.type === 'daily').length;
      const projectTasks = student.tasks.filter(task => task.type === 'project').length;
      const completedDaily = student.tasks.filter(task => task.type === 'daily' && task.status === 'Completada').length;
      const completedProject = student.tasks.filter(task => task.type === 'project' && task.status === 'Completada').length;

      return {
        studentId: student.id,
        studentName: student.username,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        dailyTasks: {
          total: dailyTasks,
          completed: completedDaily,
          rate: dailyTasks > 0 ? (completedDaily / dailyTasks) * 100 : 0,
        },
        projectTasks: {
          total: projectTasks,
          completed: completedProject,
          rate: projectTasks > 0 ? (completedProject / projectTasks) * 100 : 0,
        },
      };
    });

    res.json(progress);
  } catch (error) {
    next(error);
  }
};

// Rendimiento por tutor
export const getTutorPerformance: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const tutors = await prisma.user.findMany({
      where: { role: 'Tutor' },
      include: {
        tutoredTasks: {
          include: {
            responsible: true,
          },
        },
        tutorProjects: {
          include: {
            tasks: true,
            participants: true,
          },
        },
      },
    });

    const performance = tutors.map(tutor => {
      const totalTasks = tutor.tutoredTasks.length;
      const completedTasks = tutor.tutoredTasks.filter(task => task.status === 'Completada').length;
      const totalProjects = tutor.tutorProjects.length;
      const completedProjects = tutor.tutorProjects.filter(project => project.status === 'Completado').length;
      const totalStudents = new Set(tutor.tutoredTasks.map(task => task.responsibleId)).size;

      return {
        tutorId: tutor.id,
        tutorName: tutor.username,
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        },
        projects: {
          total: totalProjects,
          completed: completedProjects,
          completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
        },
        studentsCount: totalStudents,
        averageTasksPerStudent: totalStudents > 0 ? totalTasks / totalStudents : 0,
      };
    });

    res.json(performance);
  } catch (error) {
    next(error);
  }
};

// Estadísticas de proyectos
export const getProjectStats: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    // Estadísticas generales de proyectos
    const totalProjects = await prisma.project.count();
    const completedProjects = await prisma.project.count({
      where: { status: 'Completado' },
    });

    // Tiempo promedio de completación
    const completedProjectsData = await prisma.project.findMany({
      where: {
        status: 'Completado',
        startDate: { not: null },
        endDate: { not: null },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    let averageCompletionTime = 0;
    if (completedProjectsData.length > 0) {
      const totalTime = completedProjectsData.reduce((acc, project) => {
        const start = new Date(project.startDate!);
        const end = new Date(project.endDate!);
        return acc + (end.getTime() - start.getTime());
      }, 0);
      averageCompletionTime = totalTime / completedProjectsData.length / (1000 * 60 * 60 * 24); // días
    }

    // Proyectos por estado
    const projectsByStatus = await prisma.project.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Tareas por proyecto
    const projectsWithTasks = await prisma.project.findMany({
      include: {
        tasks: {
          select: {
            status: true,
          },
        },
        participants: {
          select: {
            id: true,
          },
        },
      },
    });

    const projectDetails = projectsWithTasks.map(project => ({
      id: project.id,
      name: project.name,
      status: project.status,
      totalTasks: project.tasks.length,
      completedTasks: project.tasks.filter(task => task.status === 'Completada').length,
      participantsCount: project.participants.length,
      completionRate: project.tasks.length > 0
        ? (project.tasks.filter(task => task.status === 'Completada').length / project.tasks.length) * 100
        : 0,
    }));

    res.json({
      summary: {
        totalProjects,
        completedProjects,
        completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
        averageCompletionTime: Math.round(averageCompletionTime * 100) / 100, // redondear a 2 decimales
      },
      projectsByStatus,
      projectDetails,
    });
  } catch (error) {
    next(error);
  }
};

// Dashboard con métricas clave
export const getDashboardMetrics: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    // Métricas generales
    const totalUsers = await prisma.user.count();
    const totalStudents = await prisma.user.count({ where: { role: 'Alumno' } });
    const totalTutors = await prisma.user.count({ where: { role: 'Tutor' } });

    const totalTasks = await prisma.task.count();
    const completedTasks = await prisma.task.count({ where: { status: 'Completada' } });

    const totalProjects = await prisma.project.count();
    const completedProjects = await prisma.project.count({ where: { status: 'Completado' } });

    // Tareas por prioridad
    const tasksByPriority = await prisma.task.groupBy({
      by: ['priority'],
      _count: {
        id: true,
      },
    });

    // Tareas por estado
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Proyectos por estado
    const projectsByStatus = await prisma.project.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Actividad reciente usando ActivityLog (últimas 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activityLogService = ActivityLogService.getInstance();
    const recentActivities = await activityLogService.getActivityHistory(
      undefined,
      undefined,
      undefined,
      sevenDaysAgo,
      undefined,
      1000
    );

    // Contar actividades por tipo
    const activityCounts = recentActivities.reduce((acc, activity) => {
      if (!acc[activity.action]) {
        acc[activity.action] = 0;
      }
      acc[activity.action]++;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      overview: {
        totalUsers,
        totalStudents,
        totalTutors,
        totalTasks,
        completedTasks,
        taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        totalProjects,
        completedProjects,
        projectCompletionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
      },
      breakdowns: {
        tasksByPriority,
        tasksByStatus,
        projectsByStatus,
      },
      recentActivity: {
        totalActivities: recentActivities.length,
        activitiesByType: activityCounts,
        recentActivities: recentActivities.slice(0, 10), // últimas 10 actividades
      },
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint para consultar historial de actividades
export const getActivityHistory: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { userId, entityType, entityId, startDate, endDate, limit, offset } = req.query;

    // Solo tutores pueden ver historial de otros usuarios
    if (userId && parseInt(userId as string) !== req.user.id && req.user.role !== 'Tutor') {
      return res.status(403).json({ message: 'No autorizado para ver historial de otros usuarios.' });
    }

    const activityLogService = ActivityLogService.getInstance();
    const activities = await activityLogService.getActivityHistory(
      userId ? parseInt(userId as string) : undefined,
      entityType as string,
      entityId ? parseInt(entityId as string) : undefined,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 50,
      offset ? parseInt(offset as string) : 0
    );

    res.json({
      activities,
      total: activities.length,
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint de bienvenida que registra la solicitud
export const getWelcome: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const activityLogService = ActivityLogService.getInstance();
    await activityLogService.logActivity({
      userId: req.user.id,
      action: 'ACCESS',
      entityType: 'ENDPOINT',
      entityId: 0, // No hay entidad específica
      details: `Solicitud ${req.method} a ${req.path}`,
    });

    res.json({ message: 'Welcome to the API!' });
  } catch (error) {
    next(error);
  }
};
