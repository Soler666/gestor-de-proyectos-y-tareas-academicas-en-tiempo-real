import { Router } from 'express';
import verifyToken from '../middleware/jwt/verifyToken';
import prisma from '../config/database';
import userService from '../service/userService';
import { GmailService } from '../service/gmailService';

const router = Router();
const gmailService = GmailService.getInstance();

// Proteger con token
router.use(verifyToken);

// Middleware para verificar permisos de admin
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  }
  next();
};

// Gestión de usuarios - solo admin
router.use('/users', requireAdmin);

router.get('/users', async (req: any, res) => {
  try {
    const users = await userService.getAll();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

router.get('/users/pending', async (req: any, res) => {
  try {
    const users = await userService.getPendingUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo usuarios pendientes' });
  }
});

router.put('/users/:userId/approve', async (req: any, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario requerido.' });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ message: 'ID de usuario inválido.' });
    }

    // Aprobar el usuario
    const approvedUser = await userService.approveUser(userIdNum, adminId);

    // Enviar notificación por email
    try {
      const subject = 'Acceso Aprobado - Sistema de Gestión Educativa';
      const message = `
        ¡Felicitaciones ${approvedUser.firstName || approvedUser.username}!

        Tu solicitud de acceso al Sistema de Gestión de Proyectos Educativos ha sido APROBADA.
      `;

      await gmailService.sendNotificationEmail(
        approvedUser.id,
        subject,
        message,
        true // Usar cuenta de servicio
      );
    } catch (emailError) {
      console.error('Error enviando email de aprobación:', emailError);
      // No fallar la aprobación si el email falla
    }

    res.json({
      message: 'Usuario aprobado exitosamente.',
      user: approvedUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Error aprobando usuario' });
  }
});

router.put('/users/:userId/reject', async (req: any, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario requerido.' });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ message: 'ID de usuario inválido.' });
    }

    const rejectedUser = await userService.rejectUser(userIdNum, adminId);

    // Enviar notificación por email si tiene email
    if (rejectedUser.email) {
      try {
        const subject = 'Acceso Denegado - Sistema de Gestión Educativa';
        const message = `
          Hola ${rejectedUser.firstName || rejectedUser.username},

          Lamentablemente, tu solicitud de acceso al Sistema de Gestión de Proyectos Educativos ha sido RECHAZADA.

          Si crees que esto es un error o necesitas más información, por favor contacta al administrador.

          Atentamente,
          Equipo Administrativo
        `;

        await gmailService.sendNotificationEmail(
          rejectedUser.id,
          subject,
          message,
          true // Usar cuenta de servicio
        );
      } catch (emailError) {
        console.error('Error enviando email de rechazo:', emailError);
      }
    }

    res.json({
      message: 'Usuario rechazado.',
      user: rejectedUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Error rechazando usuario' });
  }
});

router.put('/users/:userId', async (req: any, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario requerido.' });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ message: 'ID de usuario inválido.' });
    }

    // No permitir cambiar ciertos campos críticos
    delete updateData.password; // Usar endpoint separado para cambiar contraseña
    delete updateData.id;
    delete updateData.createdAt;

    const updatedUser = await userService.update(userIdNum, updateData);

    res.json({
      message: 'Usuario actualizado exitosamente.',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

router.delete('/users/:userId', async (req: any, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario requerido.' });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ message: 'ID de usuario inválido.' });
    }

    await userService.delete(userIdNum);

    res.json({ message: 'Usuario eliminado exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

// Endpoint para borrar tokens de Google de una lista de usuarios (ids)
// Body: { ids: number[] }
router.post('/clear-google-tokens', requireAdmin, async (req: any, res) => {
  try {
    const ids: number[] = req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de ids.' });
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        calendarId: null,
      },
    });

    res.json({ success: true, updatedCount: result.count });
  } catch (error) {
    console.error('Error clearing google tokens:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
