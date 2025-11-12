
import { app, port } from './app';
import { config } from './config/config';
import errorHanddler from './middleware/errorHanddler';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import prisma from './config/database';
import { setIO } from './config/socket';
import { createAndEmitNotification } from './controller/notificationController';
import { ReminderService } from './service/reminderService';
import { ActivityLogService } from './service/activityLogService';
import { initializeNotificationScheduler } from './service/notificationScheduler';

type UserData = JwtPayload & { username: string };

const httpServer = createServer(app);
// Configuración de Socket.IO con opciones mejoradas
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST']
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutos
  },
  pingTimeout: 20000,
  pingInterval: 25000
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
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });
      // Log actividad
      try {
        const activityLogger = ActivityLogService.getInstance();
        await activityLogger.logChatMessage(userData.id, savedMessage.id);
      } catch (e) {
        console.error('No se pudo registrar actividad de mensaje público:', e);
      }
      // Emitir a todos los usuarios conectados
      io.emit('public-message', savedMessage);
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
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          recipient: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });
      // Log actividad
      try {
        const activityLogger = ActivityLogService.getInstance();
        await activityLogger.logChatMessage(userData.id, savedMessage.id, recipientId);
      } catch (e) {
        console.error('No se pudo registrar actividad de mensaje privado:', e);
      }

      // Emitir al destinatario
      io.to(`user_${recipientId}`).emit('private-message', savedMessage);

      // También emitir al remitente para confirmar
      socket.emit('private-message-sent', savedMessage);

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

  // Eventos para exámenes
  socket.on('exam:start', (data) => {
    const { examId } = data;
    socket.join(`exam_${examId}`);
    io.to(`exam_${examId}`).emit('exam:started', { examId, userId: userData.id });
  });

  socket.on('exam:time_update', (data) => {
    const { examId, timeRemaining } = data;
    socket.to(`exam_${examId}`).emit('exam:time_sync', { examId, timeRemaining, userId: userData.id });
  });

  socket.on('exam:time_up', (data) => {
    const { examId } = data;
    io.to(`exam_${examId}`).emit('exam:time_expired', { examId, userId: userData.id });
  });

  socket.on('exam:submit', async (data) => {
    const { examId, answers } = data;
    // Detener temporizador para este usuario
    io.to(`exam_${examId}`).emit('exam:submitted', { examId, userId: userData.id });
  });

  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${userData.username}`);
  });
});

// Inicializar el servicio de recordatorios
const reminderService = ReminderService.getInstance();

// Inicializar el servicio de programación de notificaciones
initializeNotificationScheduler();

app.use(errorHanddler);
import { setupGlobalErrorHandlers } from './util/errorHandler';

// Configurar manejadores de errores globales
setupGlobalErrorHandlers(io);

// Iniciar el servidor
httpServer.listen(port, () => {
  console.log('✅ Servidor corriendo en http://localhost:' + port);
  console.log('✅ Socket.io habilitado en el mismo puerto');
  console.log('✅ Sistema de recordatorios automáticos activado');
  
  if (config.NODE_ENV === 'production') {
    console.log('🚀 Servidor ejecutándose en modo producción');
  } else {
    console.log('🔧 Servidor ejecutándose en modo desarrollo');
  }
});
