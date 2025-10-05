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
  delete: async (id: number) => await prisma.task.delete({ where: { id } }),
};

export default taskService;
