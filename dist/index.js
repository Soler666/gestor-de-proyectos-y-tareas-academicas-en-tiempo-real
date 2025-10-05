"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const errorHanddler_1 = __importDefault(require("./middleware/errorHanddler"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const httpServer = (0, http_1.createServer)(app_1.app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
        credentials: true,
    },
});
// Middleware para autenticar usuarios en el socket
io.use((socket, next) => {
    const token = socket.handshake.headers['token'];
    if (!token) {
        return next(new Error('No token provided'));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        socket.data.user = decoded;
        next();
    }
    catch (err) {
        next(new Error('Invalid token'));
    }
});
io.on('connection', (socket) => {
    const userData = socket.data.user;
    console.log(`Usuario conectado: ${userData.username}`);
    // Canal público
    socket.on('public-message', (msg) => {
        io.emit('public-message', {
            user: userData.username,
            message: msg,
            timestamp: new Date(),
        });
    });
    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${userData.username}`);
    });
});
app_1.app.use(errorHanddler_1.default);
httpServer.listen(app_1.port, () => {
    console.log('🚀 Servidor corriendo en http://localhost:' + app_1.port);
    console.log('🟢 Socket.io habilitado en el mismo puerto');
});
//# sourceMappingURL=index.js.map