  import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../generated/prisma';

declare module 'express' {
  interface Request {
    user?: {
      id: number;
      username: string;
      role: string;
      status: string;
    };
  }
}

const prisma = new PrismaClient();

const verifyToken: RequestHandler = async (req: any, res, next) => {
  // Intenta obtener el token desde distintos lugares: cookie 'token' (cookie-parser), header 'token', o Authorization Bearer
  let token: string | undefined;
  // cookie-parser expone req.cookies
  if (req.cookies && req.cookies.token) token = req.cookies.token as string;

  const headerToken = req.headers['token'];
  if (!token && headerToken && typeof headerToken === 'string') token = headerToken;

  const authHeader = req.headers['authorization'];
  if (!token && authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: number; username: string; role: string; };
    console.log('Token decodificado:', decoded);

    // Fetch the full user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('Usuario encontrado en BD:', {
      id: user.id,
      username: user.username,
      role: user.role
    });

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export default verifyToken;
