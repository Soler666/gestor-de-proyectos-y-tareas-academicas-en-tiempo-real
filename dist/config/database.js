"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
prisma.$connect().catch((error) => {
    console.error(error);
    process.exit(1);
});
exports.default = prisma;
//# sourceMappingURL=database.js.map