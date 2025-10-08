import { RequestHandler, Request } from 'express';
import prisma from '../config/database';

interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Get all public chat messages with user info
export const getChatMessages: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        isPrivate: false,
      },
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

// Get private messages between current user and another user
export const getPrivateMessages: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { otherUserId } = req.params;
    if (!otherUserId) {
      return res.status(400).json({ message: 'ID de usuario requerido.' });
    }

    const currentUserId = req.user.id;
    const parsedOtherUserId = parseInt(otherUserId);

    if (isNaN(parsedOtherUserId)) {
      return res.status(400).json({ message: 'ID de usuario inválido.' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          {
            userId: currentUserId,
            recipientId: parsedOtherUserId,
            isPrivate: true,
          },
          {
            userId: parsedOtherUserId,
            recipientId: currentUserId,
            isPrivate: true,
          },
        ],
      },
      orderBy: { timestamp: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        recipient: {
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

// Create a new private message
export const createPrivateMessage: RequestHandler = async (req: CustomRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { message, recipientId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Mensaje inválido.' });
    }

    if (!recipientId || typeof recipientId !== 'number') {
      return res.status(400).json({ message: 'ID de destinatario requerido.' });
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return res.status(404).json({ message: 'Destinatario no encontrado.' });
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        userId: req.user.id,
        message,
        recipientId,
        isPrivate: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        recipient: {
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
