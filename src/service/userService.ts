import prisma from '../config/database'
import { IUser, IEditUser, IUserCreate } from '../model/IUser'

const userService = {
  create: async (data: IUserCreate) => await prisma.user.create({ data }),

  getAll: async () => await prisma.user.findMany(),

  getById: async (id: number) => await prisma.user.findUnique({ where: { id } }),

  getByUsername: async (username: string) => await prisma.user.findUnique({ where: { username } }),

  getByEmail: async (email: string) => await prisma.user.findFirst({ where: { username: email } }),

  update: async (id: number, data: IEditUser) => await prisma.user.update({
    where: { id },
    data,
  }),

  delete: async (id: number) => await prisma.user.delete({ where: { id } }),

  // Métodos para gestión de usuarios por admin
  getPendingUsers: async () => await prisma.user.findMany({
    where: { status: 'PENDING' },
    select: {
      id: true,
      username: true,
      role: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
    },
    orderBy: { id: 'asc' },
  }),

  approveUser: async (userId: number, adminId: number) => {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'APPROVED',
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
  },

  rejectUser: async (userId: number, adminId: number) => {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'REJECTED',
      },
    });
  },
}

export default userService
