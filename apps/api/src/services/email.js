// Email Service for Hospital Queue System
// Uses Nodemailer for sending transactional emails

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email Service using Nodemailer
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailgun.org',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@limuruhospital.co.ke';
    this.fromName = 'Limuru Cottage Hospital';
    this.enabled = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  }
  
  /**
   * Send a generic email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} [options.html] - HTML body
   * @param {string} [options.text] - Plain text body
   * @param {Array} [options.attachments] - File attachments
   * @returns {Promise<{success: boolean, messageId?: string, error?: string, mock?: boolean}>}
   */
  async send({ to, subject, html, text, attachments = [] }) {
    // Graceful fallback when SMTP is not configured
    if (!this.enabled) {
      console.log('[Email] SMTP not configured, logging email:', { to, subject });
      return { success: true, mock: true, message: 'Email logged (SMTP not configured)' };
    }
    
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
        attachments
      });
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[Email] Send failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Verify SMTP connection
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    if (!this.enabled) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('[Email] Connection verification failed:', error);
      return false;
    }
  }
  
  /**
   * Send appointment confirmation email
   * @param {string} to - Recipient email
   * @param {Object} appointmentData - Appointment details
   * @returns {Promise<Object>}
   */
  async sendAppointmentConfirmation(to, appointmentData) {
    const { patientName, date, time, department, doctor, confirmationId } = appointmentData;
    
    return this.send({
      to,
      subject: `Appointment Confirmed - ${date} at ${time}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Limuru Cottage Hospital</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #0d9488;">Appointment Confirmed</h2>
            <p>Dear ${patientName},</p>
            <p>Your appointment has been confirmed:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Time:</strong> ${time}</p>
              <p><strong>Department:</strong> ${department}</p>
              <p><strong>Doctor:</strong> ${doctor}</p>
              <p><strong>Confirmation #:</strong> ${confirmationId}</p>
            </div>
            <p>Please arrive 15 minutes before your appointment time.</p>
            <p style="color: #6b7280; font-size: 12px;">This is an automated message. Please do not reply.</p>
          </div>
        </div>
      `,
      text: `Appointment Confirmed

Dear ${patientName},

Your appointment on ${date} at ${time} has been confirmed.

Department: ${department}
Doctor: ${doctor}
Confirmation: ${confirmationId}

Please arrive 15 minutes early.`
    });
  }
  
  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {string} resetToken - Password reset token
   * @returns {Promise<Object>}
   */
  async sendPasswordReset(to, resetToken) {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
    
    return this.send({
      to,
      subject: 'Password Reset - Limuru Cottage Hospital',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Limuru Cottage Hospital</h1>
          </div>
          <div style="padding: 30px;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #0d9488; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #dc2626;">This link expires in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      `,
      text: `Password Reset

Click here to reset: ${resetUrl}

This link expires in 1 hour.`
    });
  }
  
  /**
   * Send daily report to admin
   * @param {string} to - Recipient email
   * @param {Object} reportData - Report data
   * @returns {Promise<Object>}
   */
  async sendDailyReport(to, reportData) {
    const { date, totalPatients, avgWaitTime, departmentStats } = reportData;
    
    return this.send({
      to,
      subject: `Daily Report - ${date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; color: white; padding: 20px;">
            <h1 style="margin: 0;">Daily Queue Report</h1>
          </div>
          <div style="padding: 30px;">
            <h2>Report for ${date}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
              <div style="background: #f0fdfa; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="color: #0d9488; margin: 0;">${totalPatients}</h3>
                <p>Total Patients</p>
              </div>
              <div style="background: #f0fdfa; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="color: #0d9488; margin: 0;">${avgWaitTime} min</h3>
                <p>Avg Wait Time</p>
              </div>
            </div>
            <h3>Department Breakdown</h3>
            ${departmentStats.map(d => `<p>${d.name}: ${d.patients} patients</p>`).join('')}
          </div>
        </div>
      `,
      text: `Daily Report - ${date}

Total Patients: ${totalPatients}
Avg Wait Time: ${avgWaitTime} min

Department Breakdown:
${departmentStats.map(d => `${d.name}: ${d.patients}`).join('\n')}`
    });
  }
  
  /**
   * Send staff notification email
   * @param {string} to - Recipient email
   * @param {Object} notificationData - Notification details
   * @returns {Promise<Object>}
   */
  async sendStaffNotification(to, notificationData) {
    const { title, message, priority = 'normal', actionUrl } = notificationData;
    
    const priorityColor = {
      low: '#6b7280',
      normal: '#0d9488',
      high: '#f59e0b',
      urgent: '#dc2626'
    };
    
    const color = priorityColor[priority] || priorityColor.normal;
    
    return this.send({
      to,
      subject: `[${priority.toUpperCase()}] ${title} - Limuru Cottage Hospital`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${color}; color: white; padding: 20px;">
            <h1 style="margin: 0;">${title}</h1>
          </div>
          <div style="padding: 30px;">
            <p>${message}</p>
            ${actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionUrl}" style="background: ${color}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Details
                </a>
              </div>
            ` : ''}
            <p style="color: #6b7280; font-size: 12px;">This is an automated notification. Please do not reply.</p>
          </div>
        </div>
      `,
      text: `${title}

${message}

${actionUrl ? `View details: ${actionUrl}` : ''}`
    });
  }
  
  /**
   * Send system alert email
   * @param {string} to - Recipient email
   * @param {Object} alertData - Alert details
   * @returns {Promise<Object>}
   */
  async sendSystemAlert(to, alertData) {
    const { alertType, message, details, severity = 'info' } = alertData;
    
    const severityColors = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#dc2626',
      critical: '#7f1d1d'
    };
    
    const color = severityColors[severity] || severityColors.info;
    
    return this.send({
      to,
      subject: `[${severity.toUpperCase()}] System Alert - ${alertType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${color}; color: white; padding: 20px;">
            <h1 style="margin: 0;">System Alert: ${alertType}</h1>
          </div>
          <div style="padding: 30px;">
            <p>${message}</p>
            ${details ? `
              <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; font-family: monospace;">
                <pre style="margin: 0; white-space: pre-wrap;">${JSON.stringify(details, null, 2)}</pre>
              </div>
            ` : ''}
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
              Timestamp: ${new Date().toISOString()}
            </p>
          </div>
        </div>
      `,
      text: `System Alert: ${alertType}

${message}

${details ? `Details: ${JSON.stringify(details, null, 2)}` : ''}

Timestamp: ${new Date().toISOString()}`
    });
  }
}

/**
 * Password reset token management service
 * Handles secure token generation, verification, and invalidation
 */
class PasswordResetService {
  constructor() {
    // In-memory token storage (use Redis/DB for production with multiple instances)
    this.tokens = new Map();
  }
  
  /**
   * Generate a password reset token
   * @param {string} email - User email
   * @returns {string} - The generated token
   */
  generateToken(email) {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(token, {
      email,
      expires: Date.now() + 3600000, // 1 hour expiration
      used: false
    });
    return token;
  }
  
  /**
   * Verify a password reset token
   * @param {string} token - Token to verify
   * @returns {{valid: boolean, email?: string, error?: string}}
   */
  verifyToken(token) {
    const data = this.tokens.get(token);
    
    if (!data) {
      return { valid: false, error: 'Token not found' };
    }
    
    if (data.used) {
      return { valid: false, error: 'Token already used' };
    }
    
    if (Date.now() > data.expires) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { valid: true, email: data.email };
  }
  
  /**
   * Invalidate a token after use
   * @param {string} token - Token to invalidate
   */
  invalidateToken(token) {
    const data = this.tokens.get(token);
    if (data) {
      data.used = true;
    }
  }
  
  /**
   * Clean up expired tokens (call periodically)
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [token, data] of this.tokens.entries()) {
      if (data.expires < now) {
        this.tokens.delete(token);
      }
    }
  }
}

module.exports = { EmailService, PasswordResetService };
