import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { config } from './config';

// Autenticación para cuenta de servicio (server-to-server)
export const getServiceAccountAuth = () => {
  const auth = new GoogleAuth({
    keyFile: path.join(process.cwd(), 'src/config/google-credentials.json'),
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.send',
    ],
  });
  return auth;
};

// Autenticación OAuth para usuarios
export const getOAuthClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_CALLBACK_URL
  );
  return oauth2Client;
};

// Función para refrescar tokens
export const refreshAccessToken = async (refreshToken: string) => {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
};

// Función para obtener auth con tokens de usuario
export const getUserAuth = (accessToken: string, refreshToken?: string) => {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
};
