import { RequestHandler } from 'express';
import { AuthUser } from '../types/auth';
import { IUser } from '../model/IUser';
import { SubmissionService } from '../service/submissionService';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const submissionService = SubmissionService.getInstance();

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de archivos
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos de archivo permitidos
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, Word, Excel, PowerPoint, ZIP, RAR y otros formatos comunes.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB máximo
    files: 10 // Máximo 10 archivos por entrega
  }
});

export const uploadMiddleware = upload.array('files', 10);

// Crear una nueva entrega
export const createSubmission: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    if (!user.role || user.role.toUpperCase() !== 'ALUMNO') {
      return res.status(403).json({ message: 'Solo los alumnos pueden hacer entregas.' });
    }

    const { taskId, content } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!taskId) {
      return res.status(400).json({ message: 'ID de tarea es requerido.' });
    }

    const submission = await submissionService.createSubmission(
      parseInt(taskId),
      user.id,
      content,
      files
    );

    res.status(201).json({
      message: 'Entrega realizada exitosamente',
      submission
    });
  } catch (error) {
    next(error);
  }
};

// Obtener entregas del estudiante actual
export const getStudentSubmissions: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    if (!user.role || user.role.toUpperCase() !== 'ALUMNO') {
      return res.status(403).json({ message: 'Esta ruta es solo para alumnos.' });
    }

    const submissions = await submissionService.getStudentSubmissions(user.id);
    res.json(submissions);
  } catch (error) {
    next(error);
  }
};

// Obtener entregas pendientes de calificación (para tutores)
export const getSubmissionsForGrading: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    if (!user.role || user.role.toUpperCase() !== 'TUTOR') {
      return res.status(403).json({ message: 'Esta ruta es solo para tutores.' });
    }

    const submissions = await submissionService.getSubmissionsForGrading(user.id);
    res.json(submissions);
  } catch (error) {
    next(error);
  }
};

// Calificar una entrega
export const gradeSubmission: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    if (!user.role || user.role.toUpperCase() !== 'TUTOR') {
      return res.status(403).json({ message: 'Solo los tutores pueden calificar entregas.' });
    }

    const { id } = req.params;
    const { grade, feedback } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID de entrega es requerido.' });
    }

    if (!grade || typeof grade !== 'number') {
      return res.status(400).json({ message: 'Calificación es requerida y debe ser un número.' });
    }

    const updatedSubmission = await submissionService.gradeSubmission(
      parseInt(id),
      user.id,
      grade,
      feedback
    );

    res.json({
      message: 'Entrega calificada exitosamente',
      submission: updatedSubmission
    });
  } catch (error) {
    next(error);
  }
};

// Obtener una entrega específica
export const getSubmissionById: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID de entrega es requerido.' });
    }

    const submission = await submissionService.getSubmissionById(
      parseInt(id),
      user.id,
      user.role
    );

    res.json(submission);
  } catch (error) {
    next(error);
  }
};

// Eliminar una entrega
export const deleteSubmission: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    if (!user.role || user.role.toUpperCase() !== 'ALUMNO') {
      return res.status(403).json({ message: 'Solo los alumnos pueden eliminar sus entregas.' });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID de entrega es requerido.' });
    }

    await submissionService.deleteSubmission(parseInt(id), user.id);

    res.json({ message: 'Entrega eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};

// Descargar archivo de una entrega
export const downloadFile: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { submissionId, fileId } = req.params;

    if (!submissionId || !fileId) {
      return res.status(400).json({ message: 'IDs de entrega y archivo son requeridos.' });
    }

    // Verificar que el usuario tiene acceso a la entrega
    const submission = await submissionService.getSubmissionById(
      parseInt(submissionId),
      user.id,
      user.role
    );

    // Buscar el archivo en la entrega
    const file = submission.files.find((f: any) => f.id === parseInt(fileId));
    if (!file) {
      return res.status(404).json({ message: 'Archivo no encontrado.' });
    }

    // Verificar que el archivo existe físicamente
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ message: 'Archivo no encontrado en el servidor.' });
    }

    // Enviar el archivo
    res.download(file.path, file.originalName);
  } catch (error) {
    next(error);
  }
};

// Obtener estadísticas de entregas
export const getSubmissionStats: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

  const tutorId = (user.role && user.role.toUpperCase() === 'TUTOR') ? user.id : undefined;
    const stats = await submissionService.getSubmissionStats(tutorId);

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Obtener entregas de una tarea específica
export const getSubmissionsByTask: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(403).json({ message: 'No autenticado.' });
    }

    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({ message: 'ID de tarea es requerido.' });
    }

    const result = await submissionService.getSubmissionsByTask(
      parseInt(taskId),
      user.id,
      user.role
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};
