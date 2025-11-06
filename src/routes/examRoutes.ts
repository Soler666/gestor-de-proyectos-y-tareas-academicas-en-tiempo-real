import { Router } from 'express';
import {
  createExamHandler,
  getExamsForStudentHandler,
  getExamsForTutorHandler,
  submitExamHandler,
  getExamResultsHandler,
  getExamQuestionsHandler,
  deleteExamHandler,
} from '../controller/examController';
import { verifySchema } from '../middleware/validateSchema'; // Import verifySchema
import { createExamSchema, submitExamSchema } from '../model/Exam/examModel'; // Assuming Zod schemas for validation
import verifyToken from '../middleware/jwt/verifyToken';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);
// Crear examen (solo tutores)
router.post('/', verifySchema(createExamSchema), createExamHandler as any); // Add schema validation

// Obtener exámenes para estudiante
router.get('/student', getExamsForStudentHandler as any);

// Obtener exámenes creados por tutor
router.get('/tutor', getExamsForTutorHandler as any);

// Obtener preguntas de un examen específico (para estudiantes)
router.get('/:examId/questions', getExamQuestionsHandler as any);

// Enviar examen (estudiante)
router.post('/submit', verifySchema(submitExamSchema), submitExamHandler as any); // Add schema validation

// Obtener resultados de examen (tutor)
router.get('/:examId/results', getExamResultsHandler as any);

// Eliminar examen (tutor)
router.delete('/:examId', deleteExamHandler as any);

export default router;
