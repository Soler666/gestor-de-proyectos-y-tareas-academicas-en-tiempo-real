import { RequestHandler, Request } from 'express';
import prisma from '../config/database';

interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Get all chat messages with user info
export const getChatMessages: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      orderBy: { timestamp: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// Create a new chat message
export const createChatMessage: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Mensaje inválido.' });
    }
    const newMessage = await prisma.chatMessage.create({
      data: {
        userId: req.user.id,
        message,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
    res.status(201).json(newMessage);
  } catch (error) {
    next(error);
  }
};
