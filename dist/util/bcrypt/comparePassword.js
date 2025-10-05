"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const httpError_1 = __importDefault(require("../httpError"));
const comparePassword = async (password, hashedPassword) => {
    const isValid = await bcrypt_1.default.compare(password, hashedPassword);
    if (!isValid) {
        throw new httpError_1.default('invalid password', 400);
    }
};
exports.default = comparePassword;
//# sourceMappingURL=comparePassword.js.map