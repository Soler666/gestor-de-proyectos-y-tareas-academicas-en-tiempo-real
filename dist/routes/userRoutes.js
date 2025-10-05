"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userModel_1 = require("../model/User/userModel");
const verifyToken_1 = __importDefault(require("../middleware/jwt/verifyToken"));
const validateSchema_1 = require("../middleware/validateSchema");
const userController_1 = require("../controller/userController");
const userRoutes = (0, express_1.Router)();
userRoutes.use(verifyToken_1.default);
userRoutes
    .get('/', (0, validateSchema_1.verifySchema)(userModel_1.userSchema), userController_1.getUser)
    .patch('/', (0, validateSchema_1.verifySchema)(userModel_1.editUserSchema), userController_1.updateUser)
    .delete('/', (0, validateSchema_1.verifySchema)(userModel_1.userSchema), userController_1.deleteUser);
exports.default = userRoutes;
//# sourceMappingURL=userRoutes.js.map