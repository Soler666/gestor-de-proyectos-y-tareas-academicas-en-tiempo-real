"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProject = exports.updateProject = exports.getProjectById = exports.getProjects = exports.createProject = void 0;
const projectService_1 = __importDefault(require("../service/projectService"));
const projectModel_1 = require("../model/Project/projectModel");
const createProject = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(403).json({ message: 'No autenticado.' });
        }
        if (req.user.role !== 'Tutor') {
            return res.status(403).json({ message: 'Solo los tutores pueden crear proyectos.' });
        }
        const user = req.user;
        let data = req.body;
        data = { ...data, tutorId: user.id };
        // Eliminar al tutor de la lista de participantes si está incluido
        let participants = Array.isArray(data.participants) ? data.participants.filter((id) => id !== user.id) : [];
        const parsed = projectModel_1.projectSchema.parse({ ...data, participants });
        const project = await projectService_1.default.create(parsed);
        res.status(201).json(project);
    }
    catch (error) {
        next(error);
    }
};
exports.createProject = createProject;
const getProjects = async (req, res, next) => {
    try {
        let projects = await projectService_1.default.getAll();
        if (req.user && 'role' in req.user) {
            if (req.user.role === 'Tutor') {
                // Solo proyectos creados por el tutor
                projects = projects.filter(p => p.tutorId === req.user.id);
            }
            else if (req.user.role === 'Alumno') {
                // Solo proyectos donde el alumno es participante
                projects = projects.filter(p => Array.isArray(p.participants) && p.participants.some((u) => u.id === req.user.id));
            }
            else {
                // Otros roles (admin, etc) no ven nada
                projects = [];
            }
        }
        else {
            projects = [];
        }
        res.json(projects);
    }
    catch (error) {
        next(error);
    }
};
exports.getProjects = getProjects;
const getProjectById = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const project = await projectService_1.default.getById(id);
        if (!project)
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        res.json(project);
    }
    catch (error) {
        next(error);
    }
};
exports.getProjectById = getProjectById;
const updateProject = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(403).json({ message: 'No autenticado.' });
        }
        const id = Number(req.params.id);
        const project = await projectService_1.default.getById(id);
        if (!project)
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        if (project.tutorId !== req.user.id) {
            return res.status(403).json({ message: 'Solo el tutor puede actualizar el proyecto.' });
        }
        const data = req.body;
        const updatedProject = await projectService_1.default.update(id, data);
        res.json(updatedProject);
    }
    catch (error) {
        next(error);
    }
};
exports.updateProject = updateProject;
const deleteProject = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(403).json({ message: 'No autenticado.' });
        }
        const id = Number(req.params.id);
        const project = await projectService_1.default.getById(id);
        if (!project)
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        if (project.tutorId !== req.user.id) {
            return res.status(403).json({ message: 'Solo el tutor puede eliminar el proyecto.' });
        }
        await projectService_1.default.delete(id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProject = deleteProject;
//# sourceMappingURL=projectController.js.map