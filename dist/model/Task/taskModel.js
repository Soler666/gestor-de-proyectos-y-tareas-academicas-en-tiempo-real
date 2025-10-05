"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.taskSchema = zod_1.default.object({
    projectId: zod_1.default.number(),
    name: zod_1.default.string().min(1).max(255),
    description: zod_1.default.string().max(1000).nullable().optional(),
    responsibleId: zod_1.default.number(), // ID de usuario
    dueDate: zod_1.default.string().nullable().optional(),
    priority: zod_1.default.enum(['Baja', 'Media', 'Alta']),
    status: zod_1.default.enum(['Pendiente', 'En progreso', 'Completada', 'Bloqueada']),
});
//# sourceMappingURL=taskModel.js.map