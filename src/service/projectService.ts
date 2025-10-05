import prisma from '../config/database';
import { IProject } from '../model/Project/projectModel';

const projectService = {
  create: async (data: IProject) => {
    // Convertir fechas a formato ISO-8601 si existen
    const fixedData: any = {
      ...data,
      description: data.description ?? null,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      tutorId: data.tutorId ?? null,
    };
    if (data.participants) {
      fixedData.participants = {
        connect: data.participants.map((id: number) => ({ id }))
      };
    }
    return await prisma.project.create({ data: fixedData });
  },
  getAll: async () => await prisma.project.findMany({ include: { participants: true, tutor: true } }),
  getById: async (id: number) => await prisma.project.findUnique({ where: { id }, include: { participants: true, tutor: true } }),
  update: async (id: number, data: Partial<IProject>) => {
    // Convertir fechas a formato ISO-8601 si existen
    const fixedData: any = {
      ...data,
      description: data.description ?? null,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
    };
    if (data.participants) {
      // Disconnect all current participants and connect new ones
      fixedData.participants = {
        set: data.participants.map((id: number) => ({ id }))
      };
    }
    return await prisma.project.update({ where: { id }, data: fixedData });
  },
  delete: async (id: number) => {
    // Eliminar primero las tareas asociadas al proyecto
    await prisma.task.deleteMany({ where: { projectId: id } });
    return await prisma.project.delete({ where: { id } });
  },
};

export default projectService;
