import z from 'zod';
export declare const projectSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<{
        Planificación: "Planificación";
        "En progreso": "En progreso";
        Completado: "Completado";
        Pausado: "Pausado";
    }>;
    participants: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    tutorId: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type IProject = z.infer<typeof projectSchema>;
//# sourceMappingURL=projectModel.d.ts.map