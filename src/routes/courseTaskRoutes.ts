import { Router } from 'express'
import verifyToken from '../middleware/jwt/verifyToken'
import {
  createCourseTask,
  getCourseTasks,
  getCourseTaskById,
  updateCourseTask,
  deleteCourseTask,
} from '../controller/courseTaskController'

const courseTaskRoutes = Router()

// Proteger todas las rutas con token
courseTaskRoutes.use(verifyToken)

// POST /courses/:courseId/tasks - Crear tarea para todo el curso
courseTaskRoutes.post('/:courseId/tasks', createCourseTask as any)

// GET /courses/:courseId/tasks - Obtener tareas del curso
courseTaskRoutes.get('/:courseId/tasks', getCourseTasks as any)

// GET /courses/:courseId/tasks/:taskId - Obtener detalle de tarea
courseTaskRoutes.get('/:courseId/tasks/:taskId', getCourseTaskById as any)

// PUT /courses/:courseId/tasks/:taskId - Actualizar tarea
courseTaskRoutes.put('/:courseId/tasks/:taskId', updateCourseTask as any)

// DELETE /courses/:courseId/tasks/:taskId - Eliminar tarea
courseTaskRoutes.delete('/:courseId/tasks/:taskId', deleteCourseTask as any)

export default courseTaskRoutes
