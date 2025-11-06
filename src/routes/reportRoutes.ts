import { Router } from 'express';
import {
  getStudentProgress,
  getTutorPerformance,
  getProjectStats,
  getDashboardMetrics,
  getActivityHistory,
  getWelcome,
} from '../controller/reportController';
import verifyToken from '../middleware/jwt/verifyToken';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Progreso de estudiantes
router.get('/student-progress', getStudentProgress as any);

// Rendimiento de tutores
router.get('/tutor-performance', getTutorPerformance as any);

// Estadísticas de proyectos
router.get('/project-stats', getProjectStats as any);

// Dashboard con métricas generales
router.get('/dashboard', getDashboardMetrics as any);

// Historial de actividades
router.get('/activity-history', getActivityHistory as any);

// Endpoint de bienvenida
router.get('/welcome', getWelcome as any);

export default router;
