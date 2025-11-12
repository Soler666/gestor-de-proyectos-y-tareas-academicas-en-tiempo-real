import { PrismaClient } from '../generated/prisma';
import { generateQuestions, Question } from './aiService';
import { createAndEmitNotification } from '../controller/notificationController';

const prisma = new PrismaClient();

export interface CreateExamData {
  title: string;
  topics: string;
  numQuestions: number;
  timeLimit: number;
  createdBy: number;
  assignedTo: number[];
}

export async function createExam(data: CreateExamData) {
  const topicsArray = data.topics.split(',').map(t => t.trim());
  const questions = await generateQuestions(topicsArray, data.numQuestions);

  const exam = await prisma.exam.create({
    data: {
      title: data.title,
      topics: JSON.stringify(topicsArray),
      numQuestions: data.numQuestions,
      timeLimit: data.timeLimit,
      generatedQuestions: JSON.stringify(questions),
      createdBy: data.createdBy,
      assignedTo: JSON.stringify(data.assignedTo),
    },
  });

  // Crear preguntas en la base de datos
  for (const q of questions) {
    await prisma.examQuestion.create({
      data: {
        examId: exam.id,
        question: q.question,
        options: q.options ? JSON.stringify(q.options) : undefined,
        correctAnswer: q.correctAnswer,
        type: q.type,
      },
    });
  }

  // Notificar a los estudiantes asignados
  for (const studentId of data.assignedTo) {
    await createAndEmitNotification(
      studentId,
      `Nuevo examen asignado: "${data.title}". Tienes ${data.timeLimit} minutos para completarlo.`,
      'exam_assigned',
      exam.id,
      'exam'
    );
  }

  return exam;
}

export async function getExamsForStudent(studentId: number) {
  // Incluir exámenes activos o exámenes ya completados por el estudiante (para que no "desaparezcan"),
  // manteniendo filtrado por asignación.
  const exams = await prisma.exam.findMany({
    where: {
      OR: [
        { status: 'active' },
        { submissions: { some: { studentId } } }
      ],
    },
    include: {
      questions: true,
      submissions: {
        where: { studentId },
      },
    },
  });

  // Filtrar por asignación al estudiante
  return exams.filter(exam => {
    try {
      const assignedTo = exam.assignedTo ? JSON.parse(exam.assignedTo) : [];
      return assignedTo.includes(studentId);
    } catch (error) {
      console.error('Error parsing assignedTo for exam', exam.id, error);
      return false;
    }
  });
}

export async function getExamsForTutor(tutorId: number) {
  const exams = await prisma.exam.findMany({
    where: { createdBy: tutorId },
    include: {
      submissions: {
        include: { student: true },
      },
    },
  });

  // Add assigned users for display
  for (const exam of exams) {
    try {
      const assignedIds = exam.assignedTo ? JSON.parse(exam.assignedTo) : [];
      if (assignedIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: assignedIds } },
          select: { id: true, username: true }
        });
        (exam as any).assignedUsers = users;
      } else {
        (exam as any).assignedUsers = [];
      }
    } catch (error) {
      console.error('Error parsing assignedTo for exam', exam.id, error);
      (exam as any).assignedUsers = [];
    }
  }

  return exams;
}

export async function submitExam(examId: number, studentId: number, answers: Record<string, string>) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: true },
  });
  if (!exam) throw new Error('Examen no encontrado.');

  try {
    const assignedTo = exam.assignedTo ? JSON.parse(exam.assignedTo) : [];
    if (!assignedTo.includes(studentId)) throw new Error('No asignado a este examen.');
  } catch (error) {
    console.error('Error parsing assignedTo for exam', examId, error);
    throw new Error('Error en la asignación del examen.');
  }

  // Calcular puntuación
  let correct = 0;
  const review: any = {};
  exam.questions.forEach((q) => {
    const userAnswerIndex = answers[q.id.toString()]; // "0", "1", "2", "3"
    
    // La respuesta correcta del backend puede ser "a)" o "a) Texto completo"
    // Extraer solo la letra (primer carácter antes del paréntesis)
    let correctIndex = '';
    if (q.correctAnswer) {
      const match = q.correctAnswer.match(/^([a-d])\)/i);
      if (match && match[1]) {
        // Convertir letra a índice: a->0, b->1, c->2, d->3
        const letterMap: Record<string, string> = { 'a': '0', 'b': '1', 'c': '2', 'd': '3' };
        correctIndex = letterMap[match[1].toLowerCase()] || '';
      }
    }
    
    const isCorrect = userAnswerIndex === correctIndex;
    if (isCorrect) correct++;
    
    review[q.id] = {
      question: q.question,
      userAnswer: userAnswerIndex,
      correctAnswer: q.correctAnswer,
      isCorrect,
    };
  });

  const score = (correct / exam.questions.length) * 5; // Escala 1-5

  const submission = await prisma.examSubmission.create({
    data: {
      examId,
      studentId,
      answers: JSON.stringify(answers),
      score,
      review: JSON.stringify(review),
    },
  });

  // Notificar al tutor que el estudiante terminó el examen
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { username: true }
  });

  await createAndEmitNotification(
    exam.createdBy,
    `El estudiante ${student?.username} ha completado el examen "${exam.title}". Calificación: ${score.toFixed(1)}/5.0`,
    'exam_submitted',
    exam.id,
    'exam'
  );

  // Verificar si todos los estudiantes asignados completaron el examen
  const assignedStudents = exam.assignedTo ? JSON.parse(exam.assignedTo) : [];
  const allSubmissions = await prisma.examSubmission.findMany({
    where: { examId },
    select: { studentId: true }
  });
  const submittedStudentIds = allSubmissions.map(sub => sub.studentId);
  
  // Si todos los estudiantes asignados ya enviaron su examen, marcar como completado
  const allCompleted = assignedStudents.every((id: number) => submittedStudentIds.includes(id));
  if (allCompleted && exam.status !== 'completed') {
    await prisma.exam.update({
      where: { id: examId },
      data: { status: 'completed' }
    });
  }

  return submission;
}

export async function getExamResults(examId: number, tutorId: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId, createdBy: tutorId },
    include: {
      submissions: {
        include: { student: true },
      },
    },
  });
  if (!exam) throw new Error('Examen no encontrado o no autorizado.');

  const stats = {
    totalStudents: exam.submissions.length,
    averageScore: exam.submissions.length > 0 ? exam.submissions.reduce((sum, s) => sum + s.score, 0) / exam.submissions.length : 0,
    submissions: exam.submissions,
  };

  return stats;
}

export async function getExamQuestions(examId: number, studentId: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: true },
  });
  if (!exam) throw new Error('Examen no encontrado.');

  try {
    const assignedTo = exam.assignedTo ? JSON.parse(exam.assignedTo) : [];
    if (!assignedTo.includes(studentId)) throw new Error('No asignado a este examen.');
  } catch (error) {
    console.error('Error parsing assignedTo for exam', examId, error);
    throw new Error('Error en la asignación del examen.');
  }

  // Check if student has already submitted
  const existingSubmission = await prisma.examSubmission.findFirst({
    where: { examId, studentId },
  });
  if (existingSubmission) throw new Error('Ya has enviado este examen.');

  return {
    examId: exam.id,
    title: exam.title,
    timeLimit: exam.timeLimit,
    questions: exam.questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options ? JSON.parse(q.options as string) : null,
      type: q.type,
    })),
  };
}

export async function deleteExam(examId: number, tutorId: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) throw new Error('Examen no encontrado.');
  if (exam.createdBy !== tutorId) throw new Error('No autorizado para eliminar este examen.');

  // Delete exam questions first (due to foreign key constraint)
  await prisma.examQuestion.deleteMany({
    where: { examId },
  });

  // Delete exam submissions
  await prisma.examSubmission.deleteMany({
    where: { examId },
  });

  // Delete the exam
  await prisma.exam.delete({
    where: { id: examId },
  });

  return { message: 'Examen eliminado exitosamente.' };
}
