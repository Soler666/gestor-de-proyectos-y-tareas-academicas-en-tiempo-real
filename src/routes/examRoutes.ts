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
import verifyToken from '../middleware/jwt/verifyToken';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Crear examen (solo tutores)
router.post('/', createExamHandler);

// Obtener exámenes para estudiante
router.get('/student', getExamsForStudentHandler);

// Obtener exámenes creados por tutor
router.get('/tutor', getExamsForTutorHandler);

// Obtener preguntas de un examen específico (para estudiantes)
router.get('/:examId/questions', getExamQuestionsHandler);

// Enviar examen (estudiante)
router.post('/submit', submitExamHandler);

// Obtener resultados de examen (tutor)
router.get('/:examId/results', getExamResultsHandler);

// Eliminar examen (tutor)
router.delete('/:examId', deleteExamHandler);

export default router;
