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
router.get('/student-progress', getStudentProgress);

// Rendimiento de tutores
router.get('/tutor-performance', getTutorPerformance);

// Estadísticas de proyectos
router.get('/project-stats', getProjectStats);

// Dashboard con métricas generales
router.get('/dashboard', getDashboardMetrics);

// Historial de actividades
router.get('/activity-history', getActivityHistory);

// Endpoint de bienvenida
router.get('/welcome', getWelcome);

export default router;
