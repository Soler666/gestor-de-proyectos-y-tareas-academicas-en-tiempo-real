"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySchema = void 0;
const zod_1 = require("zod");
const verifySchema = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                message: 'validation Error',
                errors: error.issues.map((err) => ({
                    path: err.path,
                    message: err.message,
                })),
            });
        }
        throw new Error('Error verificando schema: ', error.message);
    }
};
exports.verifySchema = verifySchema;
//# sourceMappingURL=validateSchema.js.map