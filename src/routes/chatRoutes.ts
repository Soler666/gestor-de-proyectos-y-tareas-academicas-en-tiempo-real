import { Router } from 'express';
import { getChatMessages } from '../controller/chatController';

const router = Router();

router.get('/messages', getChatMessages);

export default router;
