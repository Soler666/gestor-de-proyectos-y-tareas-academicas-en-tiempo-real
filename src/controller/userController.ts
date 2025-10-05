import { RequestHandler, Request } from 'express'
import type { IUser } from '../model/IUser'
import userService from '../service/userService'

interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export const getUsers: RequestHandler = async (req: CustomRequest, res) => {
  if (!req.user || req.user.role !== 'Tutor') {
    return res.status(403).json({ message: 'Solo tutores pueden ver la lista de usuarios' });
  }
  const users = await userService.getAll()
  console.log('Users:', users);
  res.json(users)
}

export const getUser: RequestHandler = async (req: CustomRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  const user = await userService.getById(req.user.id)
  return !user
    ? res.status(404).json({
        message: 'usuario no encontrado',
      })
    : res.json(user)
}

export const updateUser: RequestHandler = async (req: CustomRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  const data:IUser = req.body
  const user = await userService.update(req.user.id, data)
  return res.json(user)
}

export const deleteUser: RequestHandler = async (req: CustomRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  await userService.delete(req.user.id)
  return res.status(204).send()
}
