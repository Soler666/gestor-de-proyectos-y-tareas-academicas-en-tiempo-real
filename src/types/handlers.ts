import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { RequestHandler } from 'express-serve-static-core';

export const createTypedHandler = <T>(handler: RequestHandler): RequestHandler => {
  return handler as RequestHandler;
};

export const createSchemaValidator = (schema: ZodSchema) => {
  const handler: RequestHandler = (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        message: 'Validation Error',
        errors: (error as ZodError).issues?.map((err: ZodIssue) => ({
          path: err.path,
          message: err.message,
        })),
      });
    }
  };
  return handler;
};