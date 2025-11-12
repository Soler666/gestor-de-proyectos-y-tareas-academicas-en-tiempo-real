import { Router, RequestHandler } from 'express';
import { ActivityLogService } from '../service/activityLogService';
import verifyToken from '../middleware/jwt/verifyToken';
import { AuthUser } from '../types/auth';

const router = Router();
const activityLogService = ActivityLogService.getInstance();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener historial de actividades por entidad
const getActivityByEntity: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { entityType, entityId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    if (!entityType || !entityId) {
      return res.status(400).json({ message: 'Tipo de entidad e ID son requeridos.' });
    }

    const activities = await activityLogService.getActivityHistory(
      undefined,
      entityType,
      parseInt(entityId),
      undefined,
      undefined,
      limit
    );

    res.json(activities);
  } catch (error) {
    next(error);
  }
};

router.get('/:entityType/:entityId', getActivityByEntity as any);

export default router;
