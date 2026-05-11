import { Request, Response } from 'express'
import prisma from '../config/database'

const ADMIN_ROLE = 'ADMIN'

export const adminUpdateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = (req as any).user
    if (!requester || requester.role !== ADMIN_ROLE) {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
      return
    }

    const userIdParam = req.params.userId
    const userId = Number(userIdParam)
    if (!userIdParam || Number.isNaN(userId)) {
      res.status(400).json({ message: 'ID de usuario inválido.' })
      return
    }

    const { role, firstName, lastName, email, username, profileComplete, status } = req.body ?? {}

    // Validación mínima: no permitir campos sensibles
    // (No incluimos password en update por seguridad)
    const updateData: any = {}
    if (typeof username === 'string') updateData.username = username
    if (typeof firstName === 'string' || firstName === null) updateData.firstName = firstName
    if (typeof lastName === 'string' || lastName === null) updateData.lastName = lastName
    if (typeof email === 'string' || email === null) updateData.email = email
    if (typeof profileComplete === 'boolean') updateData.profileComplete = profileComplete
    if (typeof status === 'string') updateData.status = status

    if (role !== undefined) {
      if (!['ADMIN', 'TUTOR', 'STUDENT'].includes(role)) {
        res.status(400).json({ message: 'Rol inválido. Debe ser ADMIN, TUTOR o STUDENT.' })
        return
      }
      updateData.role = role
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
        profileComplete: true,
        status: true,
        googleId: true,
        calendarId: true,
      },
    })

    res.json({
      message: 'Usuario actualizado exitosamente.',
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('adminUpdateUser error:', error)
    res.status(500).json({ error: 'Error actualizando usuario' })
  }
}

