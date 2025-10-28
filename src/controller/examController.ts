import { Request, Response } from 'express';
import { createExam, getExamsForStudent, getExamsForTutor, submitExam, getExamResults, getExamQuestions, deleteExam } from '../service/examService';

export const createExamHandler = async (req: Request, res: Response) => {
  try {
    const { title, topics, numQuestions, timeLimit, assignedTo } = req.body;
    const createdBy = (req as any).user.id;

    const exam = await createExam({
      title,
      topics,
      numQuestions,
      timeLimit,
      createdBy,
      assignedTo,
    });

    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getExamsForStudentHandler = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const exams = await getExamsForStudent(studentId);
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getExamsForTutorHandler = async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).user.id;
    const exams = await getExamsForTutor(tutorId);
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const submitExamHandler = async (req: Request, res: Response) => {
  try {
    const { examId, answers } = req.body;
    const studentId = (req as any).user.id;

    const submission = await submitExam(parseInt(examId), studentId, answers);
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getExamResultsHandler = async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const tutorId = (req as any).user.id;

    const results = await getExamResults(parseInt(examId!), tutorId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getExamQuestionsHandler = async (req: Request, res: Response) => {
  try {
    const examId = parseInt(req.params.examId!);
    const studentId = (req as any).user.id;

    const questions = await getExamQuestions(examId, studentId);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const deleteExamHandler = async (req: Request, res: Response) => {
  try {
    const examId = parseInt(req.params.examId!);
    const tutorId = (req as any).user.id;

    const result = await deleteExam(examId, tutorId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
