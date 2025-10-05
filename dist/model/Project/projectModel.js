"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.projectSchema = zod_1.default.object({
    name: zod_1.default.string().min(1).max(255),
    description: zod_1.default.string().max(1000).optional(),
    startDate: zod_1.default.string().optional(),
    endDate: zod_1.default.string().optional(),
    status: zod_1.default.enum(['Planificación', 'En progreso', 'Completado', 'Pausado']),
    participants: zod_1.default.array(zod_1.default.number()).optional(), // IDs de alumnos
    tutorId: zod_1.default.number().optional(), // Se asigna automáticamente en el controlador
});
//# sourceMappingURL=projectModel.js.map