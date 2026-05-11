import { Request, Response } from 'express'
import prisma from '../config/database'


const ADMIN_ROLE = 'ADMIN'
const TUTOR_ROLE = 'TUTOR'
const STUDENT_ROLE = 'STUDENT'

const parseIds = (value: any): number[] => {
  if (!Array.isArray(value)) return []
  const ids = value.map((v) => Number(v)).filter((n) => !Number.isNaN(n))
  return ids
}

const isAdmin = (user: any): boolean => {
  return user && user.role === ADMIN_ROLE
}

export const adminCreateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = (req as any).user
    if (!isAdmin(requester)) {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
      return
    }

    const { name, description } = req.body ?? {}

    if (!name || typeof name !== 'string') {
      res.status(400).json({ message: 'El campo name es requerido.' })
      return
    }

    const course = await prisma.course.create({
      data: {
        name,
        description: typeof description === 'string' ? description : null,
      },
    })

    res.status(201).json({ message: 'Curso creado exitosamente.', course })
  } catch (error: any) {
    console.error('adminCreateCourse error:', error)
    res.status(500).json({ error: 'Error creando curso' })
  }
}

export const adminGetCourseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = (req as any).user
    if (!isAdmin(requester)) {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
      return
    }

    const courseId = Number(req.params.courseId)
    if (Number.isNaN(courseId)) {
      res.status(400).json({ message: 'courseId inválido.' })
      return
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        tutor: { select: { id: true, username: true, firstName: true, lastName: true, email: true } },
        enrollments: {
          include: {
            student: { select: { id: true, username: true, firstName: true, lastName: true, email: true } }
          }
        },
        tasks: {
          select: { id: true, name: true, dueDate: true, status: true }
        }
      }
    })

    if (!course) {
      res.status(404).json({ message: 'Curso no encontrado.' })
      return
    }

    res.json({
      ...course,
      studentCount: course.enrollments.length,
      taskCount: course.tasks.length,
    })
  } catch (error: any) {
    console.error('adminGetCourseById error:', error)
    res.status(500).json({ error: 'Error obteniendo curso' })
  }
}

export const adminUpdateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = (req as any).user
    if (!isAdmin(requester)) {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
      return
    }

    const courseId = Number(req.params.courseId)
    if (Number.isNaN(courseId)) {
      res.status(400).json({ message: 'courseId inválido.' })
      return
    }

    const { name, description } = req.body ?? {}

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: 'Debe proporcionar al menos un campo para actualizar.' })
      return
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: updateData,
      include: {
        tutor: { select: { id: true, username: true } },
        enrollments: { select: { studentId: true } }
      }
    })

    res.json({ message: 'Curso actualizado exitosamente.', course })
  } catch (error: any) {
    console.error('adminUpdateCourse error:', error)
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Curso no encontrado.' })
    } else {
      res.status(500).json({ error: 'Error actualizando curso' })
    }
  }
}

export const adminDeleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = (req as any).user
    if (!isAdmin(requester)) {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
      return
    }

    const courseId = Number(req.params.courseId)
    if (Number.isNaN(courseId)) {
      res.status(400).json({ message: 'courseId inválido.' })
      return
    }

    // Eliminar curso (en cascada se eliminarán enrollments y tasks)
    const deletedCourse = await prisma.course.delete({
      where: { id: courseId }
    })

    res.json({ message: 'Curso eliminado exitosamente.', courseId: deletedCourse.id })
  } catch (error: any) {
    console.error('adminDeleteCourse error:', error)
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Curso no encontrado.' })
    } else {
      res.status(500).json({ error: 'Error eliminando curso' })
    }
  }
}

export const adminAssignTutorToCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = (req as any).user
    if (!isAdmin(requester)) {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
      return
    }

    const courseIdParam = req.params.courseId
    const courseId = Number(courseIdParam)
    if (!courseIdParam || Number.isNaN(courseId)) {
      res.status(400).json({ message: 'courseId inválido.' })
      return
    }

    const { tutorId } = req.body ?? {}
    const tutorIdNum = Number(tutorId)
    if (!tutorId || Number.isNaN(tutorIdNum)) {
      res.status(400).json({ message: 'tutorId inválido.' })
      return
    }

    const tutor = await prisma.user.findUnique({
      where: { id: tutorIdNum },
      select: { id: true, role: true },
    })

    if (!tutor) {
      res.status(404).json({ message: 'Tutor no encontrado.' })
      return
    }

    if (tutor.role !== TUTOR_ROLE) {
      res.status(400).json({ message: 'El usuario seleccionado no tiene rol TUTOR.' })
      return
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: { tutorId: tutorIdNum },
      select: {
        id: true,
        name: true,
        description: true,
        tutorId: true,
        tutor: { select: { id: true, username: true } },
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json({ message: 'Tutor asignado al curso exitosamente.', course })
  } catch (error: any) {
    console.error('adminAssignTutorToCourse error:', error)
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Curso no encontrado.' })
    } else {
      res.status(500).json({ error: 'Error asignando tutor al curso' })
    }
  }
}

export const adminEnrollStudentsInCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = (req as any).user
    if (!isAdmin(requester)) {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
      return
    }

    const courseIdParam = req.params.courseId
    const courseId = Number(courseIdParam)
    if (!courseIdParam || Number.isNaN(courseId)) {
      res.status(400).json({ message: 'courseId inválido.' })
      return
    }

    const studentIds = parseIds((req.body ?? {}).studentIds)
    if (studentIds.length === 0) {
      res.status(400).json({ message: 'Se requiere studentIds: number[] con al menos un ID.' })
      return
    }

    // Validar que los estudiantes existan.
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true },
    })

    const foundIds = existingUsers.map((u) => u.id)
    const missing = studentIds.filter((id) => !foundIds.includes(id))
    if (missing.length > 0) {
      res.status(400).json({ message: 'Uno o más studentIds no existen.', missing })
      return
    }

    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    })

    if (!existingCourse) {
      res.status(404).json({ message: 'Curso no encontrado.' })
      return
    }

    // Normalizar IDs para evitar duplicados en memoria
    const uniqueStudentIds = Array.from(new Set(studentIds))

    // Filtrar studentIds que YA están inscritos en este course para evitar duplicados
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        studentId: { in: uniqueStudentIds },
      },
      select: { studentId: true },
    })

    const existingEnrollmentStudentIds = new Set(
      existingEnrollments.map((e) => e.studentId)
    )

    const missingStudentIds = uniqueStudentIds.filter(
      (id) => !existingEnrollmentStudentIds.has(id)
    )

    const enrollments = missingStudentIds.length
      ? await prisma.enrollment.createMany({
          data: missingStudentIds.map((studentId) => ({ courseId, studentId })),
        })
      : { count: 0 } as any

    res.status(201).json({
      message: 'Estudiantes inscritos exitosamente.',
      insertedCount: enrollments.count,
      alreadyEnrolled: existingEnrollmentStudentIds.size
    })
  } catch (error: any) {
    console.error('adminEnrollStudentsInCourse error:', error)
    res.status(500).json({ error: 'Error inscribiendo estudiantes al curso' })
  }
}

export const adminUnenrollStudentFromCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = (req as any).user
    if (!isAdmin(requester)) {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
      return
    }

    const courseId = Number(req.params.courseId)
    const studentId = Number(req.params.studentId)

    if (Number.isNaN(courseId) || Number.isNaN(studentId)) {
      res.status(400).json({ message: 'courseId y studentId deben ser números válidos.' })
      return
    }

    const enrollment = await prisma.enrollment.delete({
      where: {
        courseId_studentId: { courseId, studentId }
      }
    })

    res.json({ message: 'Estudiante desmatriculado exitosamente.', enrollment })
  } catch (error: any) {
    console.error('adminUnenrollStudentFromCourse error:', error)
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Matriculación no encontrada.' })
    } else {
      res.status(500).json({ error: 'Error desmatriculando estudiante' })
    }
  }
}

export const adminGetCourseStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = (req as any).user
    if (!isAdmin(requester)) {
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
      return
    }

    const courseId = Number(req.params.courseId)
    if (Number.isNaN(courseId)) {
      res.status(400).json({ message: 'courseId inválido.' })
      return
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: { select: { id: true, username: true, firstName: true, lastName: true, email: true, role: true } }
      }
    })

    if (enrollments.length === 0) {
      res.json({
        courseId,
        students: [],
        studentCount: 0
      })
      return
    }

    res.json({
      courseId,
      students: enrollments.map(e => ({
        ...e.student,
        enrolledAt: e.createdAt
      })),
      studentCount: enrollments.length
    })
  } catch (error: any) {
    console.error('adminGetCourseStudents error:', error)
    res.status(500).json({ error: 'Error obteniendo estudiantes del curso' })
  }
}