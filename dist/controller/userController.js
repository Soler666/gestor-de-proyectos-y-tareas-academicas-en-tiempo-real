"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getUser = void 0;
const userService_1 = __importDefault(require("../service/userService"));
const getUser = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }
    const user = await userService_1.default.getById(req.user.id);
    return !user
        ? res.status(404).json({
            message: 'usuario no encontrado',
        })
        : res.json(user);
};
exports.getUser = getUser;
const updateUser = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }
    const data = req.body;
    const user = await userService_1.default.update(req.user.id, data);
    return res.json(user);
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }
    await userService_1.default.delete(req.user.id);
    return res.status(204).send();
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=userController.js.map