"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const projectService = {
    create: async (data) => {
        const fixedData = {
            ...data,
            description: data.description ?? null,
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
            tutorId: data.tutorId ?? null,
        };
        if (data.participants) {
            fixedData.participants = {
                connect: data.participants.map((id) => ({ id }))
            };
        }
        return await database_1.default.project.create({ data: fixedData });
    },
    getAll: async () => await database_1.default.project.findMany({ include: { participants: true } }),
    getById: async (id) => await database_1.default.project.findUnique({ where: { id } }),
    update: async (id, data) => {
        const fixedData = {
            ...data,
            description: data.description ?? null,
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
        };
        if (data.participants) {
            fixedData.participants = {
                connect: data.participants.map((id) => ({ id }))
            };
        }
        return await database_1.default.project.update({ where: { id }, data: fixedData });
    },
    delete: async (id) => {
        // Eliminar primero las tareas asociadas al proyecto
        await database_1.default.task.deleteMany({ where: { projectId: id } });
        return await database_1.default.project.delete({ where: { id } });
    },
};
exports.default = projectService;
//# sourceMappingURL=projectService.js.map