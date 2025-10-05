"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyToken_1 = __importDefault(require("../middleware/jwt/verifyToken"));
const projectController_1 = require("../controller/projectController");
const projectRoutes = (0, express_1.Router)();
projectRoutes.use(verifyToken_1.default);
projectRoutes
    .post('/', projectController_1.createProject)
    .get('/', projectController_1.getProjects)
    .get('/:id', projectController_1.getProjectById)
    .patch('/:id', projectController_1.updateProject)
    .delete('/:id', projectController_1.deleteProject);
exports.default = projectRoutes;
//# sourceMappingURL=projectRoutes.js.map