// Email Notification Service
// Uses Resend for transactional emails

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

const DEFAULT_FROM = 'Limuru Cottage Hospital <notifications@limuruhospital.co.ke>';

export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName?: string;

  constructor(config: EmailConfig) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  private getFrom(): string {
    if (this.fromName) {
      return `${this.fromName} <${this.fromEmail}>`;
    }
    return this.fromEmail;
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const recipients = Array.isArray(options.to) ? options.to.join(',') : options.to;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: options.from || this.getFrom(),
          to: recipients,
          cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : undefined,
          bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc) : undefined,
          reply_to: options.replyTo,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments?.map(att => ({
            filename: att.filename,
            content: att.content,
          })),
        }),
      });

      const data = await response.json() as any;

      if (response.ok) {
        return {
          success: true,
          messageId: data.id,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to send email',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending email',
      };
    }
  }

  async sendAppointmentReminder(
    to: string,
    data: {
      patientName: string;
      appointmentDate: string;
      appointmentTime: string;
      department: string;
      doctorName?: string;
    }
  ): Promise<EmailResult> {
    const html = this.getAppointmentReminderHtml(data);
    const text = this.getAppointmentReminderText(data);

    return this.sendEmail({
      to,
      subject: `Appointment Reminder - ${data.appointmentDate} at ${data.appointmentTime}`,
      html,
      text,
    });
  }

  async sendWelcomeEmail(
    to: string,
    data: {
      patientName: string;
      patientId: string;
      loginUrl?: string;
    }
  ): Promise<EmailResult> {
    const html = this.getWelcomeEmailHtml(data);
    const text = this.getWelcomeEmailText(data);

    return this.sendEmail({
      to,
      subject: 'Welcome to Limuru Cottage Hospital',
      html,
      text,
    });
  }

  async sendQueueUpdate(
    to: string,
    data: {
      patientName: string;
      ticketNumber: string;
      position: number;
      estimatedWait: number;
      department: string;
    }
  ): Promise<EmailResult> {
    const html = this.getQueueUpdateHtml(data);
    const text = this.getQueueUpdateText(data);

    return this.sendEmail({
      to,
      subject: `Queue Update - You are #${data.position} in line`,
      html,
      text,
    });
  }

  async sendCalledNotification(
    to: string,
    data: {
      patientName: string;
      ticketNumber: string;
      room: string;
      department: string;
    }
  ): Promise<EmailResult> {
    const html = this.getCalledNotificationHtml(data);
    const text = this.getCalledNotificationText(data);

    return this.sendEmail({
      to,
      subject: `It's Your Turn! - Please proceed to Room ${data.room}`,
      html,
      text,
    });
  }

  async sendAppointmentConfirmation(
    to: string,
    data: {
      patientName: string;
      appointmentDate: string;
      appointmentTime: string;
      department: string;
      doctorName?: string;
      notes?: string;
    }
  ): Promise<EmailResult> {
    const html = this.getAppointmentConfirmationHtml(data);
    const text = this.getAppointmentConfirmationText(data);

    return this.sendEmail({
      to,
      subject: `Appointment Confirmed - ${data.appointmentDate}`,
      html,
      text,
    });
  }

  async sendAppointmentCancellation(
    to: string,
    data: {
      patientName: string;
      appointmentDate: string;
      appointmentTime: string;
      department: string;
      reason?: string;
    }
  ): Promise<EmailResult> {
    const html = this.getAppointmentCancellationHtml(data);
    const text = this.getAppointmentCancellationText(data);

    return this.sendEmail({
      to,
      subject: `Appointment Cancelled - ${data.appointmentDate}`,
      html,
      text,
    });
  }

  async sendPasswordReset(
    to: string,
    data: {
      patientName: string;
      resetToken: string;
      resetUrl: string;
    }
  ): Promise<EmailResult> {
    const html = this.getPasswordResetHtml(data);
    const text = this.getPasswordResetText(data);

    return this.sendEmail({
      to,
      subject: 'Reset Your Password - Limuru Cottage Hospital',
      html,
      text,
    });
  }

  private getAppointmentReminderHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #6b7280; }
          .value { color: #111; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>This is a reminder about your upcoming appointment:</p>
            <div class="details">
              <div class="detail-row"><span class="label">Date</span><span class="value">${data.appointmentDate}</span></div>
              <div class="detail-row"><span class="label">Time</span><span class="value">${data.appointmentTime}</span></div>
              <div class="detail-row"><span class="label">Department</span><span class="value">${data.department}</span></div>
              ${data.doctorName ? `<div class="detail-row"><span class="label">Doctor</span><span class="value">${data.doctorName}</span></div>` : ''}
            </div>
            <p>Please arrive 15 minutes early to complete any necessary paperwork.</p>
          </div>
          <div class="footer">
            <p>Limuru Cottage Hospital</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getAppointmentReminderText(data: any): string {
    return `Dear ${data.patientName},

This is a reminder about your upcoming appointment at Limuru Cottage Hospital:

Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Department: ${data.department}
${data.doctorName ? `Doctor: ${data.doctorName}` : ''}

Please arrive 15 minutes early to complete any necessary paperwork.

Limuru Cottage Hospital`;
  }

  private getWelcomeEmailHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Limuru Cottage Hospital</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>Welcome to our healthcare system! Your registration is complete.</p>
            <p><strong>Your Patient ID:</strong> ${data.patientId}</p>
            ${data.loginUrl ? `<a href="${data.loginUrl}" class="button">Access Patient Portal</a>` : ''}
            <p>With your patient portal, you can:</p>
            <ul>
              <li>View your queue position in real-time</li>
              <li>Receive notifications about your appointment</li>
              <li>Access your medical records</li>
              <li>Book and manage appointments</li>
            </ul>
            <p>If you have any questions, please contact our reception.</p>
          </div>
          <div class="footer">
            <p>Limuru Cottage Hospital</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailText(data: any): string {
    return `Dear ${data.patientName},

Welcome to Limuru Cottage Hospital! Your registration is complete.

Your Patient ID: ${data.patientId}

With your patient portal, you can:
- View your queue position in real-time
- Receive notifications about your appointment
- Access your medical records
- Book and manage appointments

${data.loginUrl ? `Access your portal at: ${data.loginUrl}` : ''}

If you have any questions, please contact our reception.

Limuru Cottage Hospital`;
  }

  private getQueueUpdateHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .position { font-size: 48px; font-weight: bold; text-align: center; color: #059669; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Queue Update</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>Here's your current queue status:</p>
            <div class="position">#${data.position}</div>
            <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
            <p><strong>Estimated Wait:</strong> ${data.estimatedWait} minutes</p>
            <p><strong>Department:</strong> ${data.department}</p>
          </div>
          <div class="footer">
            <p>Limuru Cottage Hospital</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getQueueUpdateText(data: any): string {
    return `Dear ${data.patientName},

Here's your current queue status:

Position: #${data.position}
Ticket Number: ${data.ticketNumber}
Estimated Wait: ${data.estimatedWait} minutes
Department: ${data.department}

Limuru Cottage Hospital`;
  }

  private getCalledNotificationHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .room { font-size: 64px; font-weight: bold; text-align: center; color: #dc2626; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>It's Your Turn!</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>Please proceed to the following room:</p>
            <div class="room">Room ${data.room}</div>
            <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
            <p><strong>Department:</strong> ${data.department}</p>
            <p>Please check in with the receptionist upon arrival.</p>
          </div>
          <div class="footer">
            <p>Limuru Cottage Hospital</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getCalledNotificationText(data: any): string {
    return `Dear ${data.patientName},

It's your turn! Please proceed to:

Room ${data.room}

Ticket Number: ${data.ticketNumber}
Department: ${data.department}

Please check in with the receptionist upon arrival.

Limuru Cottage Hospital`;
  }

  private getAppointmentConfirmationHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>Your appointment has been confirmed:</p>
            <div class="details">
              <p><strong>Date:</strong> ${data.appointmentDate}</p>
              <p><strong>Time:</strong> ${data.appointmentTime}</p>
              <p><strong>Department:</strong> ${data.department}</p>
              ${data.doctorName ? `<p><strong>Doctor:</strong> ${data.doctorName}</p>` : ''}
              ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            </div>
            <p>Please arrive 15 minutes early. If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
          </div>
          <div class="footer">
            <p>Limuru Cottage Hospital</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getAppointmentConfirmationText(data: any): string {
    return `Dear ${data.patientName},

Your appointment has been confirmed:

Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Department: ${data.department}
${data.doctorName ? `Doctor: ${data.doctorName}` : ''}
${data.notes ? `Notes: ${data.notes}` : ''}

Please arrive 15 minutes early. If you need to cancel or reschedule, please contact us at least 24 hours in advance.

Limuru Cottage Hospital`;
  }

  private getAppointmentCancellationHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Cancelled</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>Your appointment has been cancelled:</p>
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p><strong>Date:</strong> ${data.appointmentDate}</p>
              <p><strong>Time:</strong> ${data.appointmentTime}</p>
              <p><strong>Department:</strong> ${data.department}</p>
              ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
            </div>
            <p>To book a new appointment, please contact our reception or use the patient portal.</p>
          </div>
          <div class="footer">
            <p>Limuru Cottage Hospital</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getAppointmentCancellationText(data: any): string {
    return `Dear ${data.patientName},

Your appointment has been cancelled:

Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Department: ${data.department}
${data.reason ? `Reason: ${data.reason}` : ''}

To book a new appointment, please contact our reception or use the patient portal.

Limuru Cottage Hospital`;
  }

  private getPasswordResetHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background: #fef3c7; padding: 15px; border-radius: 6px; color: #92400e; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </div>
            <div class="warning">
              This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${data.resetUrl}</p>
          </div>
          <div class="footer">
            <p>Limuru Cottage Hospital</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetText(data: any): string {
    return `Dear ${data.patientName},

We received a request to reset your password. Click the link below to create a new password:

${data.resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.

Limuru Cottage Hospital`;
  }
}

export function createEmailService(env: {
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  RESEND_FROM_NAME?: string;
}): EmailService {
  return new EmailService({
    apiKey: env.RESEND_API_KEY,
    fromEmail: env.RESEND_FROM_EMAIL,
    fromName: env.RESEND_FROM_NAME,
  });
}