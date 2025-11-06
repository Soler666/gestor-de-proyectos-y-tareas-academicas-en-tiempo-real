import { RequestHandler } from 'express';
import { AuthUser } from '../types/auth';
import prisma from '../config/database';

// Get all public chat messages with user info
export const getChatMessages: RequestHandler = async (req, res, next) => {
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

};

// Get private messages between current user and another user
export const getPrivateMessages: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }

  const { otherUserId } = req.params;
  if (!otherUserId) {
    return res.status(400).json({ message: 'ID de usuario requerido.' });
  }

  const user = req.user as AuthUser;
  const currentUserId = user.id;
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
};

// Create a new chat message
export const createChatMessage: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Mensaje inválido.' });
  }
  const user = req.user as AuthUser;
  const newMessage = await prisma.chatMessage.create({
    data: {
      userId: user.id,
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
};

// Create a new private message
export const createPrivateMessage: RequestHandler = async (req, res, next) => {
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

  const user = req.user as AuthUser;
  const newMessage = await prisma.chatMessage.create({
    data: {
      userId: user.id,
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
};
