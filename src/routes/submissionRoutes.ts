import { Router } from 'express';
import {
  createSubmission,
  getStudentSubmissions,
  getSubmissionsForGrading,
  gradeSubmission,
  getSubmissionById,
  deleteSubmission,
  downloadFile,
  getSubmissionStats,
  uploadMiddleware
} from '../controller/submissionController';
import verifyToken from '../middleware/jwt/verifyToken';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Crear una nueva entrega (con subida de archivos)
router.post('/', uploadMiddleware, createSubmission);

// Obtener entregas del estudiante actual
router.get('/student', getStudentSubmissions);

// Obtener entregas pendientes de calificación (para tutores)
router.get('/grading', getSubmissionsForGrading);

// Calificar una entrega
router.put('/:id/grade', gradeSubmission);

// Obtener una entrega específica
router.get('/:id', getSubmissionById);

// Eliminar una entrega
router.delete('/:id', deleteSubmission);

// Descargar archivo de una entrega
router.get('/:submissionId/files/:fileId/download', downloadFile);

// Obtener estadísticas de entregas
router.get('/stats', getSubmissionStats);

export default router;
