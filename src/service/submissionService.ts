import prisma from '../config/database';
import { createAndEmitNotification } from '../controller/notificationController';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';
import multer from 'multer';

export class SubmissionService {
  private static instance: SubmissionService;

  private constructor() {}

  public static getInstance(): SubmissionService {
    if (!SubmissionService.instance) {
      SubmissionService.instance = new SubmissionService();
    }
    return SubmissionService.instance;
  }

  // Crear una nueva entrega
  public async createSubmission(taskId: number, studentId: number, content?: string, files?: Express.Multer.File[]): Promise<any> {
    // Verificar que la tarea existe y pertenece al estudiante
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { responsible: true, tutor: true }
    });

    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    if (task.responsibleId !== studentId) {
      throw new Error('No tienes permiso para entregar esta tarea');
    }

    // Verificar que no haya una entrega previa
    const existingSubmission = await prisma.submission.findFirst({
      where: { taskId, studentId }
    });

    if (existingSubmission) {
      throw new Error('Ya has entregado esta tarea');
    }

    // Crear la entrega
    const submission = await prisma.submission.create({
      data: {
        taskId,
        studentId,
        content: content || null,
      },
    });

    // Procesar archivos si existen
    if (files && files.length > 0) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'submissions', submission.id.toString());
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const file of files) {
        const filePath = path.join(uploadDir, file.filename);
        fs.renameSync(file.path, filePath);

        await prisma.file.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: filePath,
            submissionId: submission.id,
          },
        });
      }
    }

    // Notificar al tutor
    if (task.tutor) {
      await createAndEmitNotification(
        task.tutor.id,
        `Nueva entrega: ${task.responsible.username} ha entregado la tarea "${task.name}"`,
        'task_submitted',
        task.id,
        'task'
      );
    }

    return submission;
  }

  // Obtener entregas de un estudiante
  public async getStudentSubmissions(studentId: number): Promise<any[]> {
    return await prisma.submission.findMany({
      where: { studentId },
      include: {
        task: {
          include: {
            project: true,
            tutor: true,
          },
        },
        files: true,
        gradedByUser: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // Obtener entregas para calificar (para tutores)
  public async getSubmissionsForGrading(tutorId: number): Promise<any[]> {
    return await prisma.submission.findMany({
      where: {
        task: {
          tutorId: tutorId,
        },
        status: 'submitted',
      },
      include: {
        task: {
          include: {
            project: true,
            responsible: true,
          },
        },
        student: true,
        files: true,
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  // Calificar una entrega
  public async gradeSubmission(submissionId: number, tutorId: number, grade: number, feedback?: string): Promise<any> {
    // Verificar que la entrega existe
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        task: {
          include: {
            responsible: true,
            tutor: true,
          },
        },
        student: true,
      },
    });

    if (!submission) {
      throw new Error('Entrega no encontrada');
    }

    // Verificar que el tutor es el responsable de la tarea
    if (submission.task.tutorId !== tutorId) {
      throw new Error('No tienes permiso para calificar esta entrega');
    }

    // Validar la calificación
    if (grade < 0 || grade > 100) {
      throw new Error('La calificación debe estar entre 0 y 100');
    }

    // Actualizar la entrega
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade,
        feedback: feedback || null,
        gradedAt: new Date(),
        gradedBy: tutorId,
        status: 'graded',
      },
      include: {
        task: true,
        student: true,
        gradedByUser: true,
      },
    });

    // Notificar al estudiante
    await createAndEmitNotification(
      submission.student.id,
      `Tu tarea "${submission.task.name}" ha sido calificada con ${grade}/100`,
      'task_graded',
      submission.task.id,
      'task'
    );

    return updatedSubmission;
  }

  // Obtener una entrega específica
  public async getSubmissionById(submissionId: number, userId: number, userRole: string): Promise<any> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        task: {
          include: {
            responsible: true,
            tutor: true,
            project: true,
          },
        },
        student: true,
        files: true,
        gradedByUser: true,
      },
    });

    if (!submission) {
      throw new Error('Entrega no encontrada');
    }

    // Verificar permisos (normalizar role para soportar variantes)
    const normalizedRole = (userRole || '').toUpperCase();
    if (normalizedRole === 'ALUMNO' && submission.studentId !== userId) {
      throw new Error('No tienes permiso para ver esta entrega');
    }

    if (normalizedRole === 'TUTOR' && submission.task.tutorId !== userId) {
      throw new Error('No tienes permiso para ver esta entrega');
    }

    return submission;
  }

  // Eliminar una entrega (solo estudiantes pueden eliminar sus propias entregas no calificadas)
  public async deleteSubmission(submissionId: number, studentId: number): Promise<void> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { files: true },
    });

    if (!submission) {
      throw new Error('Entrega no encontrada');
    }

    if (submission.studentId !== studentId) {
      throw new Error('No tienes permiso para eliminar esta entrega');
    }

    if (submission.status !== 'submitted') {
      throw new Error('No puedes eliminar una entrega que ya ha sido calificada');
    }

    // Eliminar archivos físicos
    for (const file of submission.files) {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error) {
        console.error(`Error eliminando archivo ${file.path}:`, error);
      }
    }

    // Eliminar directorio si está vacío
    const uploadDir = path.join(process.cwd(), 'uploads', 'submissions', submission.id.toString());
    try {
      if (fs.existsSync(uploadDir)) {
        fs.rmdirSync(uploadDir);
      }
    } catch (error) {
      console.error(`Error eliminando directorio ${uploadDir}:`, error);
    }

    // Eliminar de la base de datos
    await prisma.submission.delete({
      where: { id: submissionId },
    });
  }

  // Obtener estadísticas de entregas
  public async getSubmissionStats(tutorId?: number): Promise<any> {
    const whereClause = tutorId ? {
      task: { tutorId }
    } : {};

    const totalSubmissions = await prisma.submission.count({ where: whereClause });
    const gradedSubmissions = await prisma.submission.count({
      where: {
        ...whereClause,
        status: 'graded'
      }
    });
    const pendingSubmissions = await prisma.submission.count({
      where: {
        ...whereClause,
        status: 'submitted'
      }
    });

    const averageGrade = await prisma.submission.aggregate({
      where: {
        ...whereClause,
        grade: { not: null }
      },
      _avg: { grade: true }
    });

    return {
      total: totalSubmissions,
      graded: gradedSubmissions,
      pending: pendingSubmissions,
      averageGrade: averageGrade._avg.grade || 0,
    };
  }
}
