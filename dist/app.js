"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.port = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const showRequest_1 = __importDefault(require("./middleware/showRequest"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const testRoutes_1 = __importDefault(require("./routes/testRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const app = (0, express_1.default)();
exports.app = app;
const port = process.env.PORT || 8000;
exports.port = port;
app.use(express_1.default.json());
app.use(showRequest_1.default);
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
    exposedHeaders: ['token'],
    credentials: true
}));
app.get('/ping', (_req, res) => {
    res.send({ message: 'pong' });
});
app.use('/auth', authRoutes_1.default);
app.use('/user', userRoutes_1.default);
app.use('/test', testRoutes_1.default);
app.use('/projects', projectRoutes_1.default);
app.use('/tasks', taskRoutes_1.default);
//# sourceMappingURL=app.js.map