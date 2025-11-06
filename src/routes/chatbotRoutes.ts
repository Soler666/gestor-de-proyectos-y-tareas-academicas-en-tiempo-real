import { Router } from 'express';
import {
  getChatbotConversations,
  getChatbotConversation,
  createChatbotConversation,
  sendChatbotMessage,
  deleteChatbotConversation
} from '../controller/chatbotController';
import verifyToken from '../middleware/jwt/verifyToken';

const router = Router();

router.use(verifyToken);

// Get all conversations for the user
router.get('/conversations', getChatbotConversations as any);

// Get a specific conversation
router.get('/conversations/:conversationId', getChatbotConversation as any);

// Create a new conversation
router.post('/conversations', createChatbotConversation as any);

// Send a message to a conversation
router.post('/conversations/:conversationId/messages', sendChatbotMessage as any);

// Delete a conversation
router.delete('/conversations/:conversationId', deleteChatbotConversation as any);

export default router;
