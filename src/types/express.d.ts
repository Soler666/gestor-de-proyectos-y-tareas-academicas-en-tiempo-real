// Augment Express Request for both Express and express-serve-static-core consumers
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
        status?: string;
        googleId?: string | null;
        googleAccessToken?: string | null;
        googleRefreshToken?: string | null;
        googleTokenExpiry?: Date | null;
        calendarId?: string | null;
        [key: string]: any;
      }
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      username: string;
      role: string;
      status?: string;
      googleId?: string | null;
      googleAccessToken?: string | null;
      googleRefreshToken?: string | null;
      googleTokenExpiry?: Date | null;
      calendarId?: string | null;
      [key: string]: any;
    }
  }
}

export {};
