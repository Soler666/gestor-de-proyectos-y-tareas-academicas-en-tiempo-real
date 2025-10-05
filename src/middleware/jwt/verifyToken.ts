import { RequestHandler, Request } from 'express';
import jwt from 'jsonwebtoken';

interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

const verifyToken: RequestHandler = (req: CustomRequest, res, next) => {
  const token = req.headers['token'];

  if (!token || typeof token !== 'string') {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret',
    ) as { id: number; username: string; role: string; };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export default verifyToken;
