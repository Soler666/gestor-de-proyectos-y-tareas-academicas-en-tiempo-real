import z from 'zod';
export declare const taskSchema: z.ZodObject<{
    projectId: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    responsibleId: z.ZodNumber;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    priority: z.ZodEnum<{
        Baja: "Baja";
        Media: "Media";
        Alta: "Alta";
    }>;
    status: z.ZodEnum<{
        "En progreso": "En progreso";
        Pendiente: "Pendiente";
        Completada: "Completada";
        Bloqueada: "Bloqueada";
    }>;
}, z.core.$strip>;
export type ITask = z.infer<typeof taskSchema>;
//# sourceMappingURL=taskModel.d.ts.map