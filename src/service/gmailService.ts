import { google } from 'googleapis';
import { getServiceAccountAuth, getUserAuth } from '../config/googleAuth';
import prisma from '../config/database';

export class GmailService {
  private static instance: GmailService;

  private constructor() {}

  public static getInstance(): GmailService {
    if (!GmailService.instance) {
      GmailService.instance = new GmailService();
    }
    return GmailService.instance;
  }

  // Enviar email usando cuenta de servicio
  async sendEmailWithServiceAccount(
    to: string,
    subject: string,
    body: string,
    from?: string
  ) {
    try {
      const auth = getServiceAccountAuth();
      const gmail = google.gmail({ version: 'v1', auth });

      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        from ? `From: ${from}` : '',
        '',
        body,
      ].join('\n');

      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      return res.data;
    } catch (error) {
      console.error('Error sending email with service account:', error);
      throw error;
    }
  }

  // Enviar email usando tokens de usuario
  async sendEmailWithUserToken(
    userId: number,
    to: string,
    subject: string,
    body: string
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true,
          googleTokenExpiry: true,
        },
      });

      if (!user?.googleAccessToken) {
        throw new Error('User not authenticated with Google');
      }

      // Verificar si el token expiró
      if (user.googleTokenExpiry && new Date() > user.googleTokenExpiry) {
        // Refrescar token
        const { refreshAccessToken } = await import('../config/googleAuth.js');
        const newCredentials = await refreshAccessToken(user.googleRefreshToken!);

        // Actualizar en BD
        await prisma.user.update({
          where: { id: userId },
          data: {
            googleAccessToken: newCredentials.access_token!,
            googleTokenExpiry: newCredentials.expiry_date
              ? new Date(newCredentials.expiry_date)
              : undefined,
          },
        });

        user.googleAccessToken = newCredentials.access_token!;
      }

      const auth = getUserAuth(user.googleAccessToken!, user.googleRefreshToken || undefined);
      const gmail = google.gmail({ version: 'v1', auth });

      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body,
      ].join('\n');

      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      return res.data;
    } catch (error) {
      console.error('Error sending email with user token:', error);
      throw error;
    }
  }

  // Enviar notificación por email
  async sendNotificationEmail(
    userId: number,
    subject: string,
    message: string,
    useServiceAccount: boolean = true
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, email: true, firstName: true, lastName: true, role: true },
      });

      if (!user) throw new Error('User not found');

      const emailBody = `
Hola ${user.firstName || user.username},

${message}

Detalles de tu cuenta:
- Usuario: ${user.username}
- Rol: ${user.role}
- Estado: Aprobado

Ya puedes iniciar sesión en la plataforma con tus credenciales.

Saludos,
Equipo de la Plataforma Educativa
      `.trim();

      // Usar email real si existe, sino usar el de la universidad
      const recipientEmail = user.email || `sbelenol@unicartagena.edu.co`;

      if (useServiceAccount) {
        return await this.sendEmailWithServiceAccount(
          recipientEmail,
          subject,
          emailBody,
          'sbelenol@unicartagena.edu.co' // From email
        );
      } else {
        return await this.sendEmailWithUserToken(
          userId,
          recipientEmail,
          subject,
          emailBody
        );
      }
    } catch (error) {
      console.error('Error sending notification email:', error);
      throw error;
    }
  }

  // Generar y enviar reporte por email
  async sendReportEmail(
    userId: number,
    reportType: string,
    reportData: any,
    useServiceAccount: boolean = true
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      if (!user) throw new Error('User not found');

      let reportContent = '';

      switch (reportType) {
        case 'progress':
          reportContent = this.generateProgressReport(reportData);
          break;
        case 'grades':
          reportContent = this.generateGradesReport(reportData);
          break;
        case 'activity':
          reportContent = this.generateActivityReport(reportData);
          break;
        default:
          reportContent = JSON.stringify(reportData, null, 2);
      }

      const subject = `Reporte ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} - ${user.username}`;
      const emailBody = `
Hola ${user.username},

Adjunto el reporte solicitado: ${reportType}

${reportContent}

Saludos,
Equipo de la Plataforma Educativa
      `.trim();

      if (useServiceAccount) {
        return await this.sendEmailWithServiceAccount(
          `${user.username}@example.com`, // Reemplaza con email real del usuario
          subject,
          emailBody
        );
      } else {
        return await this.sendEmailWithUserToken(
          userId,
          `${user.username}@example.com`, // Reemplaza con email real del usuario
          subject,
          emailBody
        );
      }
    } catch (error) {
      console.error('Error sending report email:', error);
      throw error;
    }
  }

  private generateProgressReport(data: any): string {
    return `
Progreso Académico:
- Total de tareas: ${data.totalTasks}
- Tareas completadas: ${data.completedTasks}
- Tasa de completitud: ${data.completionRate}%

Tareas Diarias:
- Total: ${data.dailyTasks?.total || 0}
- Completadas: ${data.dailyTasks?.completed || 0}
- Tasa: ${data.dailyTasks?.rate || 0}%

Tareas de Proyecto:
- Total: ${data.projectTasks?.total || 0}
- Completadas: ${data.projectTasks?.completed || 0}
- Tasa: ${data.projectTasks?.rate || 0}%
    `.trim();
  }

  private generateGradesReport(data: any): string {
    return `
Calificaciones:
${data.grades?.map((grade: any) => `- ${grade.subject}: ${grade.score}`).join('\n') || 'No hay calificaciones disponibles'}
    `.trim();
  }

  private generateActivityReport(data: any): string {
    return `
Actividad Reciente:
${data.activities?.map((activity: any) => `- ${activity.action} en ${activity.entityType} (${activity.timestamp})`).join('\n') || 'No hay actividad reciente'}
    `.trim();
  }
}
