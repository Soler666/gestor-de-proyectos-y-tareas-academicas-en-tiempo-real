import { Router, Request, Response } from 'express'
import verifyToken from '../middleware/jwt/verifyToken'
import {
  adminCreateCourse,
  adminGetCourseById,
  adminUpdateCourse,
  adminDeleteCourse,
  adminAssignTutorToCourse,
  adminEnrollStudentsInCourse,
  adminUnenrollStudentFromCourse,
  adminGetCourseStudents
} from '../controller/adminCourseController'
import prisma from '../config/database'

const router = Router()

// Proteger con token
router.use(verifyToken)

// Middleware admin
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
  }
  next()
}

router.use(requireAdmin)

// GET /admin/courses - Listar todos los cursos
router.get('/courses', async (_req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        tutor: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          }
        },
        enrollments: {
          select: { studentId: true }
        }
      },
    })

    res.json({
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        tutorId: c.tutorId,
        tutor: c.tutor,
        studentCount: c.enrollments.length,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      })),
    })
  } catch (error) {
    console.error('GET /admin/courses error:', error)
    res.status(500).json({ error: 'Error obteniendo cursos' })
  }
})

// POST /admin/courses - Crear un nuevo curso
router.post('/courses', adminCreateCourse as any)

// GET /admin/courses/:courseId - Ver detalles de un curso
router.get('/courses/:courseId', adminGetCourseById as any)

// PUT /admin/courses/:courseId - Actualizar un curso
router.put('/courses/:courseId', adminUpdateCourse as any)

// DELETE /admin/courses/:courseId - Eliminar un curso
router.delete('/courses/:courseId', adminDeleteCourse as any)

// PUT /admin/courses/:courseId/tutor - Asignar tutor a un curso
router.put('/courses/:courseId/tutor', adminAssignTutorToCourse as any)

// POST /admin/courses/:courseId/enrollments - Matricular estudiantes
router.post('/courses/:courseId/enrollments', adminEnrollStudentsInCourse as any)

// DELETE /admin/courses/:courseId/enrollments/:studentId - Desmatricular estudiante
router.delete('/courses/:courseId/enrollments/:studentId', adminUnenrollStudentFromCourse as any)

// GET /admin/courses/:courseId/students - Listar estudiantes del curso
router.get('/courses/:courseId/students', adminGetCourseStudents as any)

export default router

