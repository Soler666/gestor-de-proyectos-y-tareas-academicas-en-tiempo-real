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
