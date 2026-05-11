import { Request, Response, RequestHandler } from 'express'
import prisma from '../config/database'
import taskService from '../service/taskService'
import { taskSchema } from '../model/Task/taskModel'
import { getIO } from '../config/socket'
import { createAndEmitNotification } from './notificationController'
import { CalendarService } from '../service/calendarService'

const TUTOR_ROLE = 'TUTOR'
const STUDENT_ROLE = 'STUDENT'

/**
 * Crear una tarea para un curso completo
 * La tarea se asigna a todos los estudiantes matriculados en el curso
 * POST /courses/:courseId/tasks
 */
export const createCourseTask: RequestHandler = async (req: any, res, next) => {
  try {
    const user = req.user
    if (!user || user.role !== TUTOR_ROLE) {
      return res.status(403).json({ message: 'Solo los tutores pueden crear tareas para cursos.' })
    }

    const courseId = Number(req.params.courseId)
    if (Number.isNaN(courseId)) {
      return res.status(400).json({ message: 'courseId inválido.' })
    }

    // Verificar que el curso existe y que el tutor es el asignado
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        tutor: true,
        enrollments: { select: { studentId: true } }
      }
    })

    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado.' })
    }

    if (course.tutorId !== user.id) {
      return res.status(403).json({ message: 'Solo el tutor del curso puede asignar tareas.' })
    }

    // Validar que hay estudiantes matriculados
    const enrolledStudentIds = course.enrollments.map(e => e.studentId)
    if (enrolledStudentIds.length === 0) {
      return res.status(400).json({ message: 'No hay estudiantes matriculados en este curso.' })
    }

    const { name, description, dueDate, priority, type = 'project' } = req.body

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'El campo name es requerido.' })
    }

    // Crear tarea para cada estudiante matriculado
    const createdTasks: any[] = []
    const calendarWarnings: string[] = []

    for (const studentId of enrolledStudentIds) {
      try {
        const taskData = {
          name,
          description: description || null,
          dueDate: dueDate || null,
          priority: priority || 'Media',
          status: 'Pendiente',
          type: type || 'project',
          courseId,
          responsibleId: studentId,
          tutorId: user.id,
          projectId: null,
        }

        // Validar con schema
        const parsed = taskSchema.parse(taskData)
        const createdTask = await taskService.create(parsed)
        const task = await taskService.getById(createdTask.id)

        if (!task) {
          console.error(`Error al recuperar la tarea creada para estudiante ${studentId}`)
          continue
        }

        createdTasks.push(task)

        // Notificar al estudiante
        await createAndEmitNotification(
          studentId,
          `Se te ha asignado una nueva tarea en el curso "${course.name}": ${task.name}`,
          'task_assigned',
          task.id,
          'task'
        )

        getIO().to(`user_${studentId}`).emit('task-created', task)

        // Sincronizar con Google Calendar si hay fecha límite
        if (task.dueDate) {
          try {
            const calendarService = CalendarService.getInstance()
            await calendarService.syncTaskToCalendar(task.id, studentId)
            console.log(`Tarea sincronizada con Google Calendar para alumno ${studentId}`)
          } catch (error: any) {
            console.error(`Error sincronizando tarea con calendario para alumno ${studentId}:`, error)
            if (error && (
              error.code === 'INSUFFICIENT_PERMISSIONS' ||
              error.message?.includes('Insufficient') ||
              error.message?.includes('not authenticated with Google')
            )) {
              calendarWarnings.push(`Alumno ID ${studentId}: sin permisos de Google Calendar`)
            } else {
              calendarWarnings.push(`Alumno ID ${studentId}: error de sincronización`)
            }
          }
        }
      } catch (error: any) {
        console.error(`Error creando tarea para estudiante ${studentId}:`, error)
      }
    }

    const responseBody: any = {
      message: `Tarea creada para ${createdTasks.length} estudiante(s) del curso.`,
      tasks: createdTasks,
      count: createdTasks.length,
      courseId,
      courseName: course.name,
    }

    if (calendarWarnings.length > 0) {
      responseBody.calendarWarning = `Algunas tareas no se sincronizaron con Google Calendar: ${calendarWarnings.join(', ')}`
      responseBody.calendarWarningCode = 'CALENDAR_SYNC_PARTIAL'
    }

    res.status(201).json(responseBody)
  } catch (error: any) {
    console.error('createCourseTask error:', error)
    next(error)
  }
}

/**
 * Obtener tareas de un curso
 * GET /courses/:courseId/tasks
 */
export const getCourseTasks: RequestHandler = async (req: any, res, next) => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ message: 'Usuario no autenticado.' })
    }

    const courseId = Number(req.params.courseId)
    if (Number.isNaN(courseId)) {
      return res.status(400).json({ message: 'courseId inválido.' })
    }

    // Verificar que el usuario tiene acceso al curso
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        tutorId: true,
        enrollments: { select: { studentId: true } }
      }
    })

    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado.' })
    }

    // Validar acceso: tutor del curso o estudiante matriculado
    const isCourseTutor = course.tutorId === user.id
    const isEnrolledStudent = course.enrollments.some(e => e.studentId === user.id)

    if (!isCourseTutor && !isEnrolledStudent && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'No tienes acceso a este curso.' })
    }

    const tasks = await prisma.task.findMany({
      where: { courseId },
      include: {
        responsible: { select: { id: true, username: true, firstName: true, lastName: true } },
        tutor: { select: { id: true, username: true, firstName: true, lastName: true } },
        project: true,
        submissions: true
      }
    })

    // Si es tutor, agrupar tareas por "huella lógica" (igual que en taskController)
    if (isCourseTutor) {
      const grouped = new Map<string, any>()

      for (const task of tasks) {
        const normalizedDate = task.dueDate ? new Date(task.dueDate).toISOString().split('.')[0] : 'null'
        const key = [
          task.name?.trim() || '',
          task.description?.trim() || '',
          normalizedDate,
          String(task.projectId ?? 'null'),
          task.priority?.trim() || '',
          task.type?.trim() || ''
        ].join('||')

        if (!grouped.has(key)) {
          grouped.set(key, {
            id: task.id,
            name: task.name,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            status: task.status,
            type: task.type,
            courseId: task.courseId,
            tutorId: task.tutorId,
            responsibles: [],
          })
        }

        const entry = grouped.get(key)
        entry.responsibles.push({
          id: task.responsibleId,
          username: task.responsible?.username,
          firstName: task.responsible?.firstName,
          lastName: task.responsible?.lastName,
          status: task.status
        })

        if (entry.status !== 'Pendiente') {
          if (task.status === 'Pendiente') {
            entry.status = 'Pendiente'
          } else if (entry.status !== 'En progreso' && task.status === 'En progreso') {
            entry.status = 'En progreso'
          }
        }
      }

      return res.json({
        courseId,
        tasks: Array.from(grouped.values()),
        count: Array.from(grouped.values()).length
      })
    }

    // Si es estudiante, mostrar sus tareas del curso
    const studentTasks = tasks.filter(t => t.responsibleId === user.id)
    res.json({
      courseId,
      tasks: studentTasks,
      count: studentTasks.length
    })
  } catch (error: any) {
    console.error('getCourseTasks error:', error)
    next(error)
  }
}

/**
 * Obtener detalles de una tarea del curso
 * GET /courses/:courseId/tasks/:taskId
 */
export const getCourseTaskById: RequestHandler = async (req: any, res, next) => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ message: 'Usuario no autenticado.' })
    }

    const courseId = Number(req.params.courseId)
    const taskId = Number(req.params.taskId)

    if (Number.isNaN(courseId) || Number.isNaN(taskId)) {
      return res.status(400).json({ message: 'courseId y taskId deben ser números válidos.' })
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        responsible: { select: { id: true, username: true, firstName: true, lastName: true } },
        tutor: { select: { id: true, username: true, firstName: true, lastName: true } },
        project: true,
        submissions: {
          include: {
            student: { select: { id: true, username: true, firstName: true, lastName: true } }
          }
        }
      }
    })

    if (!task || task.courseId !== courseId) {
      return res.status(404).json({ message: 'Tarea no encontrada en este curso.' })
    }

    // Validar acceso
    if (task.tutorId !== user.id && task.responsibleId !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'No tienes acceso a esta tarea.' })
    }

    res.json(task)
  } catch (error: any) {
    console.error('getCourseTaskById error:', error)
    next(error)
  }
}

/**
 * Actualizar una tarea del curso (solo tutor)
 * PUT /courses/:courseId/tasks/:taskId
 */
export const updateCourseTask: RequestHandler = async (req: any, res, next) => {
  try {
    const user = req.user
    if (!user || user.role !== TUTOR_ROLE) {
      return res.status(403).json({ message: 'Solo los tutores pueden actualizar tareas.' })
    }

    const courseId = Number(req.params.courseId)
    const taskId = Number(req.params.taskId)

    if (Number.isNaN(courseId) || Number.isNaN(taskId)) {
      return res.status(400).json({ message: 'courseId y taskId deben ser números válidos.' })
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task || task.courseId !== courseId) {
      return res.status(404).json({ message: 'Tarea no encontrada en este curso.' })
    }

    if (task.tutorId !== user.id) {
      return res.status(403).json({ message: 'Solo el tutor que creó esta tarea puede actualizarla.' })
    }

    const { name, description, dueDate, priority, status } = req.body
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (dueDate !== undefined) updateData.dueDate = dueDate
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) updateData.status = status

    const updatedTask = await taskService.update(taskId, updateData)

    // Notificar al estudiante responsable
    if (status) {
      const statusMessages: Record<string, string> = {
        'Completada': 'ha sido completada',
        'En progreso': 'está en progreso',
        'Pendiente': 'ha vuelto a estado pendiente'
      }
      const message = statusMessages[status] || `su estado cambió a ${status}`
      await createAndEmitNotification(
        task.responsibleId,
        `Tu tarea "${task.name}" ${message}`,
        'status_update',
        taskId,
        'task'
      )
    }

    res.json({ message: 'Tarea actualizada exitosamente.', task: updatedTask })
  } catch (error: any) {
    console.error('updateCourseTask error:', error)
    next(error)
  }
}

/**
 * Eliminar una tarea del curso (solo tutor)
 * DELETE /courses/:courseId/tasks/:taskId
 */
export const deleteCourseTask: RequestHandler = async (req: any, res, next) => {
  try {
    const user = req.user
    if (!user || user.role !== TUTOR_ROLE) {
      return res.status(403).json({ message: 'Solo los tutores pueden eliminar tareas.' })
    }

    const courseId = Number(req.params.courseId)
    const taskId = Number(req.params.taskId)

    if (Number.isNaN(courseId) || Number.isNaN(taskId)) {
      return res.status(400).json({ message: 'courseId y taskId deben ser números válidos.' })
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task || task.courseId !== courseId) {
      return res.status(404).json({ message: 'Tarea no encontrada en este curso.' })
    }

    if (task.tutorId !== user.id) {
      return res.status(403).json({ message: 'Solo el tutor que creó esta tarea puede eliminarla.' })
    }

    await taskService.delete(taskId)

    res.json({ message: 'Tarea eliminada exitosamente.', taskId })
  } catch (error: any) {
    console.error('deleteCourseTask error:', error)
    next(error)
  }
}
