"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyToken_1 = __importDefault(require("../middleware/jwt/verifyToken"));
const testRoutes = (0, express_1.Router)();
testRoutes
    .get('/protected', verifyToken_1.default, (_req, res) => {
    res.json({
        message: 'ruta protegida, si ves esto estas autenticado'
    });
})
    .get('/public', (_req, res) => {
    res.json({
        message: 'ruta publica'
    });
});
exports.default = testRoutes;
//# sourceMappingURL=testRoutes.js.map