import { Router } from 'express'
import { userSchema, editUserSchema } from '../model/User/userModel'
import verifyToken from '../middleware/jwt/verifyToken'
import { verifySchema } from '../middleware/validateSchema'
import { getUsers, getUser, updateUser, deleteUser, getPendingUsers, approveUser, rejectUser } from '../controller/userController'

const userRoutes = Router()
userRoutes.use(verifyToken)

userRoutes
  .get('/', getUsers as any)
  .get('/stats', async (req: any, res: any) => {
    try {
      const userRole = req.user?.role
      if (userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Acceso denegado. Solo administradores pueden ver estadísticas.' })
      }

      const { PrismaClient } = await import('../generated/prisma')
      const prisma = new PrismaClient()

      const [totalUsers, activeUsers, pendingUsers, approvedUsers, rejectedUsers] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'APPROVED' } }),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: { status: 'APPROVED' } }),
        prisma.user.count({ where: { status: 'REJECTED' } }),
      ])

      res.json({
        totalUsers,
        activeUsers,
        pendingUsers,
        approvedUsers,
        rejectedUsers,
      })
    } catch (error) {
      console.error('Error obteniendo estadísticas de usuarios:', error)
      res.status(500).json({ message: 'Error al obtener estadísticas' })
    }
  })
  .get('/pending', getPendingUsers as any) // Obtener usuarios pendientes de aprobación
  .get('/me', getUser as any) // No body to validate for GET /me
  .patch('/me', verifySchema(editUserSchema), updateUser as any)
  .patch('/:id/approve', approveUser as any) // Aprobar usuario
  .patch('/:id/reject', rejectUser as any) // Rechazar usuario
  .delete('/me', deleteUser as any) // No body to validate for DELETE /me

export default userRoutes
