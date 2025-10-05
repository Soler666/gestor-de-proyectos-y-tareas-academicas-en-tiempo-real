import { Request, Response, NextFunction } from 'express';
import { ZodObject } from 'zod';
export declare const verifySchema: (schema: ZodObject<any>) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validateSchema.d.ts.map