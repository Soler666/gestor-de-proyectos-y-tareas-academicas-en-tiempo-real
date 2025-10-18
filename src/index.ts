
import { app, port } from './app';
import errorHanddler from './middleware/errorHanddler';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import prisma from './config/database';
import { setIO } from './config/socket';
import { createAndEmitNotification } from './controller/notificationController';

type UserData = JwtPayload & { username: string };

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    credentials: true,
  },
});
setIO(io);

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
  // Unirse a la room del usuario para notificaciones y mensajes privados
  socket.join(`user_${userData.id}`);

  // Canal público
  socket.on('public-message', async (msg) => {
    try {
      // Guardar mensaje en la base de datos
      const savedMessage = await prisma.chatMessage.create({
        data: {
          userId: userData.id,
          message: msg,
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
      // Emitir a todos los usuarios conectados
      io.emit('public-message', {
        user: userData.username,
        role: userData.role,
        message: msg,
        timestamp: new Date(),
      });
      // Emitir notificaciones a todos los usuarios conectados excepto el remitente
      const connectedSockets = await io.fetchSockets();
      for (const s of connectedSockets) {
        const socketUser = s.data.user as UserData;
        if (socketUser && socketUser.id !== userData.id) {
          await createAndEmitNotification(
            socketUser.id,
            `${userData.username} envió un mensaje: ${msg}`,
            'message',
            savedMessage.id,
            'message'
          );
        }
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Mensaje privado
  socket.on('private-message', async (data) => {
    try {
      const { message, recipientId } = data;

      // Verificar que el destinatario existe
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
      });

      if (!recipient) {
        socket.emit('error', { message: 'Destinatario no encontrado' });
        return;
      }

      // Guardar mensaje privado en la base de datos
      const savedMessage = await prisma.chatMessage.create({
        data: {
          userId: userData.id,
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

      // Emitir al destinatario
      io.to(`user_${recipientId}`).emit('private-message', {
        id: savedMessage.id,
        user: userData.username,
        role: userData.role,
        senderId: userData.id,
        message,
        timestamp: new Date(),
        recipientId,
      });

      // También emitir al remitente para confirmar
      socket.emit('private-message-sent', {
        id: savedMessage.id,
        user: userData.username,
        role: userData.role,
        senderId: userData.id,
        message,
        timestamp: new Date(),
        recipientId,
      });

      // Crear notificación para el destinatario
      await createAndEmitNotification(
        recipientId,
        `${userData.username} te envió un mensaje privado`,
        'private_message',
        savedMessage.id,
        'message'
      );

    } catch (error) {
      console.error('Error saving private message:', error);
      socket.emit('error', { message: 'Error al enviar mensaje privado' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${userData.username}`);
  });
});

app.use(errorHanddler);
httpServer.listen(port, () => {
  console.log('Servidor corriendo en http://localhost:' + port);
  console.log('Socket.io habilitado en el mismo puerto');
});
