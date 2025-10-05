interface Payload {
    id: number;
    username: string;
}
declare const createToken: (payload: Payload, expiresIn: any) => string;
export default createToken;
//# sourceMappingURL=createToken.d.ts.map