import { Request, Response, NextFunction } from 'express';

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export type SyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;