import prisma from '../config/database';
import { ITask } from '../model/Task/taskModel';

const taskService = {
  create: async (data: ITask) => {
    // Convertir undefined a null para campos opcionales
    const fixedData: any = {
      ...data,
      description: data.description ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    };
    if (data.projectId !== undefined) {
      fixedData.projectId = data.projectId;
    }
    console.log('Creando tarea con datos:', fixedData); // Log para verificar tutorId
    const task = await prisma.task.create({ data: fixedData });
    console.log('Tarea creada:', task); // Log para verificar tarea creada
    return task;
  },
  getAll: async () => {
    const tasks = await prisma.task.findMany({
      include: {
        project: {
          include: {
            tutor: true,
          },
        },
        responsible: true,
        tutor: true,
      },
    });
    console.log('Tareas obtenidas con tutor:', tasks.map(t => ({ id: t.id, tutorId: t.tutorId, tutorUsername: t.tutor?.username }))); // Log para verificar tutor
    return tasks;
  },
  getById: async (id: number) => await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          tutor: true,
        },
      },
      responsible: true,
      tutor: true,
    },
  }),
  update: async (id: number, data: Partial<ITask>) => {
    const fixedData: any = {
      ...data,
      description: data.description ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    };
    if (data.projectId !== undefined) {
      fixedData.projectId = data.projectId;
    }
    return await prisma.task.update({ where: { id }, data: fixedData });
  },
  delete: async (id: number) => {
    // Obtener la tarea antes de eliminarla para acceder al googleEventId
    const task = await prisma.task.findUnique({
      where: { id },
      select: { googleEventId: true, responsibleId: true },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Eliminar evento de calendario si existe
    if (task.googleEventId && task.responsibleId) {
      try {
        const { CalendarService } = await import('./calendarService');
        const calendarService = CalendarService.getInstance();
        await calendarService.deleteEvent(task.responsibleId, task.googleEventId);
        console.log(`Evento de calendario eliminado para la tarea ${id}`);
      } catch (error: any) {
        console.warn(`Error eliminando evento de calendario para tarea ${id}:`, error.message);
        // No fallar la eliminación de la tarea si falla la eliminación del calendario
      }
    }

    // Eliminar entregas (submissions) y archivos asociados antes de borrar la tarea
    const submissions = await prisma.submission.findMany({
      where: { taskId: id },
      include: { files: true },
    });

    for (const submission of submissions) {
      // Eliminar archivos físicos del disco si existen
      for (const file of submission.files) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const filePath = path.join(process.cwd(), file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Archivo eliminado del disco: ${filePath}`);
          }
        } catch (err: any) {
          console.warn(`Error eliminando archivo físico: ${err.message}`);
        }
      }

      // Eliminar registros de archivos en la base de datos
      await prisma.file.deleteMany({
        where: { submissionId: submission.id },
      });
    }

    // Eliminar las entregas
    await prisma.submission.deleteMany({
      where: { taskId: id },
    });
    console.log(`Entregas eliminadas para la tarea ${id}`);

    // Eliminar la tarea de la base de datos
    return await prisma.task.delete({ where: { id } });
  },
};

export default taskService;
