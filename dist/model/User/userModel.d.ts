import z from 'zod';
export declare const userSchema: z.ZodObject<{
    username: z.ZodString;
    role: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const editUserSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=userModel.d.ts.map