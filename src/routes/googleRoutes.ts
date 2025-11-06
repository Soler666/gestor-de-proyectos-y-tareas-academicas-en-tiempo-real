import { Router, Request, Response, NextFunction } from 'express'
import { GmailService } from '../service/gmailService'
import { CalendarService } from '../service/calendarService'

const googleRouter = Router()
const gmailService = GmailService.getInstance()
const calendarService = CalendarService.getInstance()

// Enviar notificación por email
const sendNotificationEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' })
    }

    const { userId, subject, message, useServiceAccount } = req.body

    if (!userId || !subject || !message) {
      return res.status(400).json({ message: 'Faltan parámetros requeridos.' })
    }

    await gmailService.sendNotificationEmail(userId, subject, message, useServiceAccount)
    res.json({ message: 'Notificación enviada por email.' })
  } catch (error) {
    next(error)
  }
}

// Enviar reporte por email
const sendReportEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' })
    }

    const { userId, reportType, reportData, useServiceAccount } = req.body

    if (!userId || !reportType) {
      return res.status(400).json({ message: 'Faltan parámetros requeridos.' })
    }

    await gmailService.sendReportEmail(userId, reportType, reportData, useServiceAccount)
    res.json({ message: 'Reporte enviado por email.' })
  } catch (error) {
    next(error)
  }
}

// Sincronizar tarea con calendario
const syncTaskToCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' })
    }

    const { taskId } = req.params
    if (!taskId) {
      return res.status(400).json({ message: 'ID de tarea requerido.' })
    }
    const taskIdNum = parseInt(taskId)

    if (isNaN(taskIdNum)) {
      return res.status(400).json({ message: 'ID de tarea inválido.' })
    }

    const event = await calendarService.syncTaskToCalendar(taskIdNum, req.user.id)
    res.json({ message: 'Tarea sincronizada con calendario.', event })
  } catch (error) {
    next(error)
  }
}

// Sincronizar proyecto con calendario
const syncProjectToCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' })
    }

    const { projectId } = req.params
    if (!projectId) {
      return res.status(400).json({ message: 'ID de proyecto requerido.' })
    }
    const projectIdNum = parseInt(projectId)

    if (isNaN(projectIdNum)) {
      return res.status(400).json({ message: 'ID de proyecto inválido.' })
    }

    const event = await calendarService.syncProjectToCalendar(projectIdNum, req.user.id)
    res.json({ message: 'Proyecto sincronizado con calendario.', event })
  } catch (error) {
    next(error)
  }
}

// Sincronizar examen con calendario
const syncExamToCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' })
    }

    const { examId } = req.params
    if (!examId) {
      return res.status(400).json({ message: 'ID de examen requerido.' })
    }
    const examIdNum = parseInt(examId)

    if (isNaN(examIdNum)) {
      return res.status(400).json({ message: 'ID de examen inválido.' })
    }

    const event = await calendarService.syncExamToCalendar(examIdNum, req.user.id)
    res.json({ message: 'Examen sincronizado con calendario.', event })
  } catch (error) {
    next(error)
  }
}

// Obtener eventos del calendario
const getCalendarEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' })
    }

    const { calendarId, timeMin, timeMax } = req.query

    const events = await calendarService.getCalendarEvents(
      req.user.id,
      calendarId as string,
      timeMin as string,
      timeMax as string
    )
    res.json({ events })
  } catch (error) {
    next(error)
  }
}

// Actualizar evento del calendario
const updateCalendarEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' })
    }

    const { eventId } = req.params
    if (!eventId) {
      return res.status(400).json({ message: 'ID de evento requerido.' })
    }
    const { calendarId, updates } = req.body

    const event = await calendarService.updateEvent(
      req.user.id,
      eventId,
      updates,
      calendarId
    )
    res.json({ message: 'Evento actualizado.', event })
  } catch (error) {
    next(error)
  }
}

// Eliminar evento del calendario
const deleteCalendarEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autenticado.' })
    }

    const { eventId } = req.params
    if (!eventId) {
      return res.status(400).json({ message: 'ID de evento requerido.' })
    }
    const { calendarId } = req.query

    await calendarService.deleteEvent(
      req.user.id,
      eventId,
      calendarId as string
    )
    res.json({ message: 'Evento eliminado.' })
  } catch (error) {
    next(error)
  }
}

googleRouter.post('/send-notification', sendNotificationEmail as any)
googleRouter.post('/send-report', sendReportEmail as any)
googleRouter.post('/tasks/:taskId/sync-calendar', syncTaskToCalendar as any)
googleRouter.post('/projects/:projectId/sync-calendar', syncProjectToCalendar as any)
googleRouter.post('/exams/:examId/sync-calendar', syncExamToCalendar as any)
googleRouter.get('/calendar/events', getCalendarEvents as any)
googleRouter.put('/calendar/events/:eventId', updateCalendarEvent as any)
googleRouter.delete('/calendar/events/:eventId', deleteCalendarEvent as any)

export default googleRouter
