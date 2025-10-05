"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controller/authController");
const validateSchema_1 = require("../middleware/validateSchema");
const userModel_1 = require("../model/User/userModel");
const authRouter = (0, express_1.Router)();
authRouter
    .post('/register', (0, validateSchema_1.verifySchema)(userModel_1.userSchema), authController_1.register)
    .post('/login', (0, validateSchema_1.verifySchema)(userModel_1.userSchema), authController_1.login);
exports.default = authRouter;
//# sourceMappingURL=authRoutes.js.map