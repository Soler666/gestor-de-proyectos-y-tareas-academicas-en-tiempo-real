"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.getTaskById = exports.getTasks = exports.createTask = void 0;
const taskService_1 = __importDefault(require("../service/taskService"));
const taskModel_1 = require("../model/Task/taskModel");
const createTask = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || typeof user.role !== 'string') {
            return res.status(403).json({ message: 'No autenticado.' });
        }
        if (user.role !== 'Tutor') {
            return res.status(403).json({ message: 'Solo los tutores pueden crear tareas.' });
        }
        let data = req.body;
        const parsed = taskModel_1.taskSchema.parse(data);
        const task = await taskService_1.default.create(parsed);
        res.status(201).json(task);
    }
    catch (error) {
        next(error);
    }
};
exports.createTask = createTask;
const getTasks = async (req, res, next) => {
    try {
        let tasks;
        if (req.user && 'role' in req.user && req.user.role === 'Tutor') {
            tasks = await taskService_1.default.getAll();
        }
        else {
            // Filtrar solo las tareas donde el usuario es responsable
            tasks = (await taskService_1.default.getAll()).filter(t => t.responsibleId === req.user?.id);
        }
        res.json(tasks);
    }
    catch (error) {
        next(error);
    }
};
exports.getTasks = getTasks;
const getTaskById = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const task = await taskService_1.default.getById(id);
        if (!task)
            return res.status(404).json({ message: 'Tarea no encontrada' });
        res.json(task);
    }
    catch (error) {
        next(error);
    }
};
exports.getTaskById = getTaskById;
const updateTask = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = req.body;
        const task = await taskService_1.default.update(id, data);
        res.json(task);
    }
    catch (error) {
        next(error);
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await taskService_1.default.delete(id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTask = deleteTask;
//# sourceMappingURL=taskController.js.map