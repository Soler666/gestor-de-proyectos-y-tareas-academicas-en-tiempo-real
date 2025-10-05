import { Router } from 'express';
import verifyToken from '../middleware/jwt/verifyToken';
import { createProject, getProjects, getProjectById, updateProject, deleteProject } from '../controller/projectController';

const projectRoutes = Router();
projectRoutes.use(verifyToken);

projectRoutes
  .post('/', createProject)
  .get('/', getProjects)
  .get('/:id', getProjectById)
  .put('/:id', updateProject)
  .delete('/:id', deleteProject);

export default projectRoutes;
