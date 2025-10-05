"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const taskService = {
    create: async (data) => {
        // Convertir undefined a null para campos opcionales
        const fixedData = {
            ...data,
            description: data.description ?? null,
            dueDate: data.dueDate ?? null,
        };
        return await database_1.default.task.create({ data: fixedData });
    },
    getAll: async () => await database_1.default.task.findMany(),
    getById: async (id) => await database_1.default.task.findUnique({ where: { id } }),
    update: async (id, data) => {
        const fixedData = {
            ...data,
            description: data.description ?? null,
            dueDate: data.dueDate ?? null,
        };
        return await database_1.default.task.update({ where: { id }, data: fixedData });
    },
    delete: async (id) => await database_1.default.task.delete({ where: { id } }),
};
exports.default = taskService;
//# sourceMappingURL=taskService.js.map