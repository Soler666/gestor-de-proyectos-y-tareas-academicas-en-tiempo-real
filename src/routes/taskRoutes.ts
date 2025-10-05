import { Router } from 'express';
import verifyToken from '../middleware/jwt/verifyToken';
import { createTask, getTasks, getTaskById, updateTask, deleteTask } from '../controller/taskController';

const taskRoutes = Router();
taskRoutes.use(verifyToken);

taskRoutes
  .post('/', createTask)
  .get('/', getTasks)
  .get('/:id', getTaskById)
  .put('/:id', updateTask)
  .delete('/:id', deleteTask);

export default taskRoutes;
