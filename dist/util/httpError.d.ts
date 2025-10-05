declare class HttpError extends Error {
    status: number | undefined;
    constructor(message: string, status: number | undefined);
}
export default HttpError;
//# sourceMappingURL=httpError.d.ts.map