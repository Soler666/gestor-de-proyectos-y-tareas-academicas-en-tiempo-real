import { Router } from 'express';
import { getChatMessages, getPrivateMessages, createPrivateMessage } from '../controller/chatController';
import verifyToken from '../middleware/jwt/verifyToken';

const router = Router();

router.use(verifyToken);

router.get('/messages', getChatMessages as any);
router.get('/private/:otherUserId', getPrivateMessages as any);
router.post('/private', createPrivateMessage as any);

export default router;
