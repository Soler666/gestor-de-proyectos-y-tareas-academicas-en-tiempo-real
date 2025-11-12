import { Router } from 'express'
import verifyToken from '../middleware/jwt/verifyToken'

const dashboardRoutes = Router()
dashboardRoutes.use(verifyToken)

// GET /dashboard/stats - Obtener estadísticas del dashboard según el rol del usuario
dashboardRoutes.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role

    if (!userId || !userRole) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const { PrismaClient } = await import('../generated/prisma')
    const prisma = new PrismaClient()

    let stats: any = {}

    if (userRole === 'TUTOR') {
      // Estadísticas para tutores
      const [assignedTasks, supervisingProjects, completedTasks] = await Promise.all([
        // Contar tareas supervisadas por el tutor
        prisma.task.count({ where: { tutorId: userId } }),
        // Contar proyectos supervisando
        prisma.project.count({ where: { tutorId: userId, status: 'En progreso' } }),
        // Contar tareas completadas supervisadas por el tutor
        prisma.task.count({ where: { tutorId: userId, status: 'Completada' } }),
      ])

      // Contar alumnos únicos en las tareas del tutor
      const tasksWithStudents = await prisma.task.findMany({
        where: { tutorId: userId },
        select: { responsibleId: true },
        distinct: ['responsibleId']
      })
      const assignedStudents = tasksWithStudents.length

      // Calcular horas trabajadas basadas en tareas completadas
      // Por simplicidad, asumimos 1 hora por tarea completada
      // Ajustar según la lógica de negocio real
      const hoursWorked = completedTasks * 1 // 1 hora por tarea

      stats = {
        assignedStudents,
        assignedTasks,
        supervisingProjects,
        hoursWorked,
        // También incluir valores para compatibilidad con componentes existentes
        activeProjects: supervisingProjects,
        totalTasks: assignedTasks,
        completedTasks,
        pendingTasks: 0, // No relevante para tutores
      }
    } else if (userRole === 'ALUMNO') {
      // Estadísticas para alumnos
      const [allTasks, completedTasks, pendingTasks, activeProjects] = await Promise.all([
        // Tareas asignadas al alumno (donde es responsable)
        prisma.task.count({ where: { responsibleId: userId } }),
        // Tareas completadas
        prisma.task.count({ where: { responsibleId: userId, status: 'Completada' } }),
        // Tareas pendientes
        prisma.task.count({ where: { responsibleId: userId, status: 'Pendiente' } }),
        // Proyectos activos donde participa el alumno
        prisma.project.count({
          where: {
            status: 'En progreso',
            participants: { some: { id: userId } }
          }
        }),
      ])

      // Calcular horas trabajadas basadas en tareas completadas
      // Por simplicidad, asumimos 1 hora por tarea completada
      const hoursWorked = completedTasks * 1

      stats = {
        totalTasks: allTasks,
        completedTasks,
        pendingTasks,
        activeProjects,
        hoursWorked,
      }
    } else if (userRole === 'ADMIN') {
      // Estadísticas básicas para admin (puede ver todo)
      const [totalTasks, completedTasks, pendingTasks, activeProjects] = await Promise.all([
        prisma.task.count(),
        prisma.task.count({ where: { status: 'Completada' } }),
        prisma.task.count({ where: { status: 'Pendiente' } }),
        prisma.project.count({ where: { status: 'En progreso' } }),
      ])

      stats = {
        totalTasks,
        completedTasks,
        pendingTasks,
        activeProjects,
        hoursWorked: 0, // Admin no tiene horas propias
      }
    }

    await prisma.$disconnect()
    res.json(stats)
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas del dashboard' })
  }
})

export default dashboardRoutes
