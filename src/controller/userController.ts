import { Request, Response, NextFunction } from 'express'
import type { IUser } from '../model/IUser'
import userService from '../service/userService'
import { AuthUser } from '../types/auth';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await userService.getAll()
    console.log('Users:', users);
    res.json(users)
  } catch (error) {
    next(error)
  }
}

export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ message: 'Usuario no autenticado' })
      return
    }

    const user = await userService.getById(userId)
    if (!user) {
      res.status(404).json({
        message: 'usuario no encontrado',
      })
      return
    }
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ message: 'Usuario no autenticado' })
      return
    }

    const data: IUser = req.body
    const user = await userService.update(userId, data)
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ message: 'Usuario no autenticado' })
      return
    }

    await userService.delete(userId)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

// Métodos para gestión de usuarios por administrador
export const getPendingUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.role
    if (userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Acceso denegado. Solo administradores pueden ver usuarios pendientes.' })
      return
    }

    const pendingUsers = await userService.getPendingUsers()
    res.json(pendingUsers)
  } catch (error) {
    next(error)
  }
}

export const approveUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.role
    const adminId = req.user?.id
    if (userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Acceso denegado. Solo administradores pueden aprobar usuarios.' })
      return
    }

    if (!adminId) {
      res.status(401).json({ message: 'Usuario no autenticado' })
      return
    }

    const userId = parseInt(req.params.id as string)
    if (isNaN(userId)) {
      res.status(400).json({ message: 'ID de usuario inválido' })
      return
    }

    const approvedUser = await userService.approveUser(userId, adminId)

    // Enviar email de aprobación (no bloquear la respuesta si falla)
    try {
      const { GmailService } = await import('../service/gmailService')
      const gmailService = GmailService.getInstance()
      const subject = 'Tu cuenta ha sido aprobada'
      const message = 'Tu cuenta en la plataforma ha sido aprobada por el administrador. Ya puedes iniciar sesión.'
      await gmailService.sendNotificationEmail(userId, subject, message, true)
    } catch (emailError) {
      console.error('No se pudo enviar email de aprobación:', emailError)
    }

    res.json({ 
      message: 'Usuario aprobado exitosamente', 
      user: approvedUser 
    })
  } catch (error) {
    next(error)
  }
}

export const rejectUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.role
    const adminId = req.user?.id
    if (userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Acceso denegado. Solo administradores pueden rechazar usuarios.' })
      return
    }

    if (!adminId) {
      res.status(401).json({ message: 'Usuario no autenticado' })
      return
    }

    const userId = parseInt(req.params.id as string)
    if (isNaN(userId)) {
      res.status(400).json({ message: 'ID de usuario inválido' })
      return
    }

    const rejectedUser = await userService.rejectUser(userId, adminId)
    res.json({ 
      message: 'Usuario rechazado exitosamente',
      user: rejectedUser 
    })
  } catch (error) {
    next(error)
  }
}
