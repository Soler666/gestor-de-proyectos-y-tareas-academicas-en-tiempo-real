"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const userService = {
    create: async (data) => await database_1.default.user.create({ data }),
    getById: async (id) => await database_1.default.user.findFirst({ where: { id } }),
    getByUsername: async (username) => (await database_1.default.user.findUnique({ where: { username } })),
    update: async (id, data) => await database_1.default.user.update({
        where: { id },
        data,
    }),
    delete: async (id) => await database_1.default.user.delete({ where: { id } }),
};
exports.default = userService;
//# sourceMappingURL=userService.js.map