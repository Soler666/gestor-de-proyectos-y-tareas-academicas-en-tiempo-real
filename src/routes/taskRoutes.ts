import { Router } from 'express';
import verifyToken from '../middleware/jwt/verifyToken';
import { createTask, getTasks, getTaskById, updateTask, deleteTask } from '../controller/taskController';
import { verifySchema } from '../middleware/validateSchema'; // Import verifySchema
import { taskSchema } from '../model/Task/taskModel'; // Import taskSchema

const taskRoutes = Router();
taskRoutes.use(verifyToken);

taskRoutes
  .post('/', verifySchema(taskSchema), createTask as any) // Add schema validation for create
  .get('/', getTasks as any)
  .get('/:id', getTaskById as any)
  .put('/:id', verifySchema(taskSchema.partial()), updateTask as any) // Add schema validation for update (partial)
  .delete('/:id', deleteTask as any);

export default taskRoutes;
