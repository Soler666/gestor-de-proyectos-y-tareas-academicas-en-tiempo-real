"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const showRequests = async (req, _res, next) => {
    console.log(` ${req.path} - ${req.method} `);
    next();
};
exports.default = showRequests;
//# sourceMappingURL=showRequest.js.map