import { RequestHandler } from 'express';
import { AuthUser } from '../types/auth';
import prisma from '../config/database';
import ChatbotService from '../service/chatbotService';

// Get all chatbot conversations for a user
export const getChatbotConversations: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }

  const user = req.user as AuthUser;

  try {
    const conversations = await prisma.chatbotConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: false // No incluir mensajes en la lista
      }
    });

    res.json(conversations);
  } catch (error) {
    console.error('Error getting chatbot conversations:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Get a specific chatbot conversation
export const getChatbotConversation: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }

  const { conversationId } = req.params;
  const user = req.user as AuthUser;

  if (!conversationId) {
    return res.status(400).json({ message: 'ID de conversación requerido.' });
  }

  const parsedId = parseInt(conversationId);
  if (isNaN(parsedId)) {
    return res.status(400).json({ message: 'ID de conversación inválido.' });
  }

  try {
    const conversation = await prisma.chatbotConversation.findFirst({
      where: {
        id: parsedId,
        userId: user.id
      }
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada.' });
    }

    // Parsear los mensajes desde JSON
    const messages = JSON.parse(conversation.messages || '[]');

    res.json({
      id: conversation.id,
      title: conversation.title,
      messages: messages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    });
  } catch (error) {
    console.error('Error getting chatbot conversation:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Create a new chatbot conversation
export const createChatbotConversation: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }

  const { title } = req.body;
  const user = req.user as AuthUser;

  // Asignar un título provisional. Se actualizará automáticamente con el primer mensaje.
  const conversationTitle = title || 'Nueva Conversación';

  try {
    const conversation = await prisma.chatbotConversation.create({
      data: {
        userId: user.id,
        title: conversationTitle,
        messages: JSON.stringify([])
      }
    });

    res.status(201).json({
      id: conversation.id,
      title: conversation.title,
      messages: [],
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    });
  } catch (error) {
    console.error('Error creating chatbot conversation:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Send a message to the chatbot
export const sendChatbotMessage: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }

  const { conversationId } = req.params;
  const { message } = req.body;
  const user = req.user as AuthUser;

  if (!conversationId) {
    return res.status(400).json({ message: 'ID de conversación requerido.' });
  }

  const parsedConversationId = parseInt(conversationId, 10);

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ message: 'Mensaje requerido.' });
  }

  try {
    // Obtener la conversación existente
    const conversation = await prisma.chatbotConversation.findFirst({
      where: {
        id: parsedConversationId,
        userId: user.id
      }
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada.' });
    }

    // Parsear mensajes existentes
    const existingMessages = JSON.parse(conversation.messages || '[]');

    // Crear mensaje del usuario
    const userMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
      links: []
    };

    // Procesar mensaje con el servicio de chatbot
    const chatbotService = ChatbotService.getInstance();
    const { response, links } = await chatbotService.processMessage(
      message.trim(),
      existingMessages
    );

    // Crear mensaje del asistente
    const assistantMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      links: links
    };

    // Actualizar conversación con nuevos mensajes
    const updatedMessages = [...existingMessages, userMessage, assistantMessage];

    // Generar título automáticamente si no existe y es el primer mensaje
    let updateData: any = {
      messages: JSON.stringify(updatedMessages),
      updatedAt: new Date()
    };

    if ((!conversation.title || conversation.title === 'Nueva Conversación') && existingMessages.length === 0) {
      // Generar título basado en el primer mensaje
      const generatedTitle = chatbotService.generateConversationTitle(message.trim());
      updateData.title = generatedTitle;
    }

    await prisma.chatbotConversation.update({
      where: { id: parsedConversationId },
      data: updateData
    });

    res.json({
      userMessage,
      assistantMessage
    });
  } catch (error) {
    console.error('Error sending chatbot message:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Delete a chatbot conversation
export const deleteChatbotConversation: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'No autenticado.' });
  }

  const { conversationId } = req.params;
  const user = req.user as AuthUser;

  if (!conversationId) {
    return res.status(400).json({ message: 'ID de conversación requerido.' });
  }

  const parsedId = parseInt(conversationId);
  if (isNaN(parsedId)) {
    return res.status(400).json({ message: 'ID de conversación inválido.' });
  }

  try {
    const conversation = await prisma.chatbotConversation.findFirst({
      where: {
        id: parsedId,
        userId: user.id
      }
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada.' });
    }

    await prisma.chatbotConversation.delete({
      where: { id: parsedId }
    });

    res.json({ message: 'Conversación eliminada exitosamente.' });
  } catch (error) {
    console.error('Error deleting chatbot conversation:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
