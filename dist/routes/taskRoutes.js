"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyToken_1 = __importDefault(require("../middleware/jwt/verifyToken"));
const taskController_1 = require("../controller/taskController");
const taskRoutes = (0, express_1.Router)();
taskRoutes.use(verifyToken_1.default);
taskRoutes
    .post('/', taskController_1.createTask)
    .get('/', taskController_1.getTasks)
    .get('/:id', taskController_1.getTaskById)
    .patch('/:id', taskController_1.updateTask)
    .delete('/:id', taskController_1.deleteTask);
exports.default = taskRoutes;
//# sourceMappingURL=taskRoutes.js.map