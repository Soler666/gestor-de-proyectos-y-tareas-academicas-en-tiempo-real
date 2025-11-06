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
import { verifySchema } from '../middleware/validateSchema'; // Import verifySchema
import { createSubmissionSchema, gradeSubmissionSchema } from '../model/Submission/submissionModel'; // Assuming Zod schemas for validation
import verifyToken from '../middleware/jwt/verifyToken';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);
// Crear una nueva entrega (con subida de archivos)
router.post('/', uploadMiddleware, verifySchema(createSubmissionSchema), createSubmission as any); // Add schema validation

// Obtener entregas del estudiante actual
router.get('/student', getStudentSubmissions as any);

// Obtener entregas pendientes de calificación (para tutores)
router.get('/grading', getSubmissionsForGrading as any);

// Calificar una entrega (tutor)
router.put('/:id/grade', verifySchema(gradeSubmissionSchema), gradeSubmission as any); // Add schema validation

// Obtener una entrega específica
router.get('/:id', getSubmissionById as any);

// Eliminar una entrega
router.delete('/:id', deleteSubmission as any);

// Descargar archivo de una entrega
router.get('/:submissionId/files/:fileId/download', downloadFile as any);

// Obtener estadísticas de entregas
router.get('/stats', getSubmissionStats as any);

export default router;
