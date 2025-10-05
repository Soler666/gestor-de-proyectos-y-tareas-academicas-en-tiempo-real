"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const createToken_1 = __importDefault(require("../middleware/jwt/createToken"));
const userService_1 = __importDefault(require("../service/userService"));
const hashpassword_1 = __importDefault(require("../util/bcrypt/hashpassword"));
const comparePassword_1 = __importDefault(require("../util/bcrypt/comparePassword"));
const register = async (req, res) => {
    const data = req.body;
    const hashedPassword = await (0, hashpassword_1.default)(data.password);
    await userService_1.default.create({
        ...data,
        password: hashedPassword,
    });
    res.status(200).json({ message: 'usuario creado' });
};
exports.register = register;
const login = async (req, res) => {
    const data = req.body;
    const user = await userService_1.default.getByUsername(data.username);
    if (!user)
        return res.status(404).json({ message: 'username no encontrado' });
    await (0, comparePassword_1.default)(data.password, user.password);
    const payload = {
        id: user.id,
        username: data.username,
        role: user.role,
    };
    const token = (0, createToken_1.default)(payload, '1h');
    res.header('token', token).json({ user: payload });
};
exports.login = login;
//# sourceMappingURL=authController.js.map