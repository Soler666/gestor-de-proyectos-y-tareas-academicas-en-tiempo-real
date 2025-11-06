declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
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

export {};
