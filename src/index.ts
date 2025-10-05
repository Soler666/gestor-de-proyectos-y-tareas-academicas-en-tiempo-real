
import { app, port } from './app';
import errorHanddler from './middleware/errorHanddler';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import prisma from './config/database';

type UserData = JwtPayload & { username: string };

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    credentials: true,
  },
});

// Middleware para autenticar usuarios en el socket
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error('No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    socket.data.user = decoded as UserData;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userData = socket.data.user as UserData;
  console.log(`Usuario conectado: ${userData.username}`);
  // Canal público
  socket.on('public-message', async (msg) => {
    try {
      // Guardar mensaje en la base de datos
      await prisma.chatMessage.create({
        data: {
          userId: userData.id,
          message: msg,
        },
      });
      // Emitir a todos los usuarios conectados
      io.emit('public-message', {
        user: userData.username,
        role: userData.role,
        message: msg,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${userData.username}`);
  });
});

app.use(errorHanddler);
httpServer.listen(port, () => {
  console.log('🚀 Servidor corriendo en http://localhost:' + port);
  console.log('🟢 Socket.io habilitado en el mismo puerto');
});
