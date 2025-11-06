import { Request } from 'express';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  status: string;
  password: string;
  googleId?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: Date;
  calendarId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface GoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
  role?: string;
  email?: string;
  firstName?: string;
  chatbotConversations?: any[];
  lastName?: string;
}
