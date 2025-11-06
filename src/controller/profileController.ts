import { Request, Response } from 'express';
import prisma from '../config/database';
import { profileSchema } from '../model/User/profileSchema';

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const validatedData = profileSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...validatedData,
        profileComplete: true
      }
    });

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        profileComplete: updatedUser.profileComplete
      }
    });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileComplete: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};