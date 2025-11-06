import { Router } from 'express';
import verifyToken from '../middleware/jwt/verifyToken';
import { createProject, getProjects, getProjectById, updateProject, deleteProject } from '../controller/projectController';

const projectRoutes = Router();
projectRoutes.use(verifyToken);

projectRoutes
  .post('/', createProject as any)
  .get('/', getProjects as any)
  .get('/:id', getProjectById as any)
  .put('/:id', updateProject as any)
  .delete('/:id', deleteProject as any);

export default projectRoutes;
