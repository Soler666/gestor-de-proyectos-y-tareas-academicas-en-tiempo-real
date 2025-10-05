"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorHanddler = (error, _req, res, _next) => {
    console.log(error);
    let message = error.message || 'internal server error';
    let status = error.status || 500;
    if (error.constructor.name === 'PrismaClientKnownRequestError') {
        switch (error.code) {
            case 'P2002':
                message = `el ${error.meta?.target} ya está en uso`;
                status = 400;
                break;
            default:
                message = `Error de prisma no manejado, revisar logs`;
                break;
        }
    }
    return res.status(status).json({
        message,
        status
    });
};
exports.default = errorHanddler;
//# sourceMappingURL=errorHanddler.js.map