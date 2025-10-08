import { Router } from 'express';
import { getChatMessages, getPrivateMessages, createPrivateMessage } from '../controller/chatController';
import verifyToken from '../middleware/jwt/verifyToken';

const router = Router();

router.use(verifyToken);

router.get('/messages', getChatMessages);
router.get('/private/:otherUserId', getPrivateMessages);
router.post('/private', createPrivateMessage);

export default router;
