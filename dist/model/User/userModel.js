"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editUserSchema = exports.userSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const baseUser = {
    username: zod_1.default.string().min(1).max(255),
    role: zod_1.default.string().min(1).max(255),
    password: zod_1.default.string().min(1),
};
exports.userSchema = zod_1.default.object(baseUser);
exports.editUserSchema = zod_1.default.object(baseUser)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe enviar al menos un campo para editar',
    path: [], // aplica el error al nivel del objeto completo
});
//# sourceMappingURL=userModel.js.map