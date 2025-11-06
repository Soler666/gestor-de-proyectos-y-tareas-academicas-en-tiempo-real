import { Server } from 'socket.io';
import { config } from '../config/config';

export const setupGlobalErrorHandlers = (io: Server) => {
  // Manejo de errores no capturados en promesas
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Aquí podrías implementar notificación a un servicio de monitoreo
  });

  // Manejo de excepciones no capturadas
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Aquí podrías implementar notificación a un servicio de monitoreo
    
    if (config.NODE_ENV === 'production') {
      // En producción, intenta un apagado graceful
      io.close(() => {
        process.exit(1);
      });
      
      // Si el servidor no se cierra en 10 segundos, forzar el cierre
      setTimeout(() => {
        process.exit(1);
      }, 10000);
    }
  });

  // Manejo de señales de terminación
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    io.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT. Performing graceful shutdown...');
    io.close(() => {
      process.exit(0);
    });
  });
};