import nodemailer from 'nodemailer';
import { NotificationConfig } from '../types';

export class EmailService {
  static async sendNotification(
    config: NotificationConfig['email'],
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<boolean> {
    console.log('[EmailService] sendNotification called with config:', {
      enabled: config?.enabled,
      host: config?.host,
      port: config?.port,
      username: config?.username,
      toEmails: config?.toEmails
    });
    
    if (!config || !config.enabled) {
      console.log('[EmailService] Email notifications disabled or config missing');
      return false;
    }

    // Validate required fields
    if (!config.host || !config.port || !config.username || !config.password || !config.toEmails || config.toEmails.length === 0) {
      console.error('[Email] Missing required configuration fields');
      return false;
    }

    try {
      // Determine if we should use TLS (secure: true) or STARTTLS (secure: false)
      const useTLS = config.port === 465;
      
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: useTLS, // true for 465 (TLS), false for 587 (STARTTLS)
        auth: {
          user: config.username,
          pass: config.password,
        },
        tls: {
          rejectUnauthorized: true, // Enforce SSL certificate validation
        },
      });

      // Verify connection
      await transporter.verify();
      console.log('[Email] SMTP connection verified');

      // Send email
      const info = await transporter.sendMail({
        from: config.fromEmail ? `"${config.fromName || 'Registry Radar'}" <${config.fromEmail}>` : `"${config.fromName || 'Registry Radar'}" <${config.username}>`,
        to: config.toEmails.join(', '),
        subject: subject,
        text: textContent,
        html: htmlContent,
      });

      console.log('[Email] Message sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('[Email] Failed to send email:', error);
      return false;
    }
  }

  static async sendUpdateNotification(
    config: NotificationConfig['email'],
    containerName: string,
    image: string,
    tag: string
  ): Promise<boolean> {
    const subject = `Registry Radar - Update Available: ${containerName}`;
    
    const textContent = `
Registry Radar Notification
━━━━━━━━━━━━━━━━━━━━━━━━━━

A new version is available for one of your monitored containers.

Container: ${containerName}
Image: ${image}:${tag}

Please update your container to get the latest version.

━━━━━━━━━━━━━━━━━━━━━━━━━━
Registry Radar - Docker Image Monitoring
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #3b82f6; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .icon { display: inline-block; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📦 Container Update Available</h1>
    </div>
    <div class="content">
      <p>A new version is available for one of your monitored containers:</p>
      
      <div class="info-box">
        <strong>🏷️ Container:</strong> ${containerName}<br>
        <strong>📦 Image:</strong> <code>${image}:${tag}</code>
      </div>
      
      <p>Please update your container to get the latest version.</p>
    </div>
    <div class="footer">
      Registry Radar - Docker Image Monitoring<br>
      Automated notification system
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendNotification(config, subject, htmlContent, textContent);
  }

  static async sendErrorNotification(
    config: NotificationConfig['email'],
    errorMessage: string,
    container?: string
  ): Promise<boolean> {
    const subject = `Registry Radar - Error${container ? `: ${container}` : ''}`;
    
    const textContent = `
Registry Radar Notification
━━━━━━━━━━━━━━━━━━━━━━━━━━

An error occurred during registry monitoring.

${container ? `Container: ${container}\n` : ''}Error: ${errorMessage}

Please check your container configuration and try again.

━━━━━━━━━━━━━━━━━━━━━━━━━━
Registry Radar - Docker Image Monitoring
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .error-box { background: #fef2f2; padding: 15px; margin: 10px 0; border-left: 4px solid #ef4444; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">❌ Registry Monitoring Error</h1>
    </div>
    <div class="content">
      <p>An error occurred during registry monitoring:</p>
      
      <div class="error-box">
        ${container ? `<strong>📦 Container:</strong> ${container}<br>` : ''}
        <strong>⚠️ Error:</strong> ${errorMessage}
      </div>
      
      <p>Please check your container configuration and try again.</p>
    </div>
    <div class="footer">
      Registry Radar - Docker Image Monitoring<br>
      Automated notification system
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendNotification(config, subject, htmlContent, textContent);
  }

  static async sendRunNotification(
    config: NotificationConfig['email'],
    totalContainers: number,
    updatesFound: number,
    errors: number
  ): Promise<boolean> {
    const subject = `Registry Radar - Check Complete: ${updatesFound} Update${updatesFound !== 1 ? 's' : ''} Found`;
    
    const textContent = `
Registry Radar Notification
━━━━━━━━━━━━━━━━━━━━━━━━━━

Scheduled registry check completed.

Total Containers: ${totalContainers}
Updates Found: ${updatesFound}
Errors: ${errors}

━━━━━━━━━━━━━━━━━━━━━━━━━━
Registry Radar - Docker Image Monitoring
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 15px 0; }
    .stat-box { background: white; padding: 15px; text-align: center; border-radius: 4px; border: 1px solid #e5e7eb; }
    .stat-number { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Registry Check Complete</h1>
    </div>
    <div class="content">
      <p>Your scheduled registry check has completed.</p>
      
      <div class="stats">
        <div class="stat-box">
          <div class="stat-number">${totalContainers}</div>
          <div class="stat-label">Total Containers</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" style="color: ${updatesFound > 0 ? '#f59e0b' : '#10b981'};">${updatesFound}</div>
          <div class="stat-label">Updates Found</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" style="color: ${errors > 0 ? '#ef4444' : '#10b981'};">${errors}</div>
          <div class="stat-label">Errors</div>
        </div>
      </div>
    </div>
    <div class="footer">
      Registry Radar - Docker Image Monitoring<br>
      Automated notification system
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendNotification(config, subject, htmlContent, textContent);
  }

  static async sendIndividualReports(
    config: NotificationConfig['email'],
    containers: Array<{name: string, image: string, tag: string, status: string}>
  ): Promise<boolean> {
    const subject = `Registry Radar - Individual Container Status Report (${containers.length} containers)`;
    
    const textContent = `
Registry Radar Notification
━━━━━━━━━━━━━━━━━━━━━━━━━━

Individual status report for all monitored containers:

${containers.map(container => 
  `Container: ${container.name}
Image: ${container.image}:${container.tag}
Status: ${container.status}`
).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━
Registry Radar - Docker Image Monitoring
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .container-item { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #3b82f6; border-radius: 4px; }
    .container-name { font-weight: bold; color: #1f2937; margin-bottom: 5px; }
    .container-details { font-size: 14px; color: #6b7280; }
    .status { font-weight: bold; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📋 Individual Container Status Report</h1>
    </div>
    <div class="content">
      <p>Status report for all monitored containers:</p>
      
      ${containers.map(container => `
        <div class="container-item">
          <div class="container-name">${container.name}</div>
          <div class="container-details">
            <strong>Image:</strong> <code>${container.image}:${container.tag}</code><br>
            <strong>Status:</strong> <span class="status">${container.status}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="footer">
      Registry Radar - Docker Image Monitoring<br>
      Automated notification system
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendNotification(config, subject, htmlContent, textContent);
  }

  static async sendTestNotification(
    config: NotificationConfig['email']
  ): Promise<boolean> {
    console.log('[EmailService] sendTestNotification called with config:', {
      enabled: config?.enabled,
      host: config?.host,
      port: config?.port,
      username: config?.username,
      toEmails: config?.toEmails
    });
    
    const subject = 'Registry Radar - Test Email';
    
    const textContent = `
This is a test email from Registry Radar.

If you received this email, your SMTP configuration is working correctly!

━━━━━━━━━━━━━━━━━━━━━━━━━━
Registry Radar - Docker Image Monitoring
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .success-box { background: #f0fdf4; padding: 15px; margin: 10px 0; border-left: 4px solid #10b981; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✉️ Test Email</h1>
    </div>
    <div class="content">
      <div class="success-box">
        <strong>✅ Success!</strong><br>
        Your email configuration is working correctly.
      </div>
      
      <p>This is a test email from Registry Radar.</p>
      <p>You will receive notifications at this address when:</p>
      <ul>
        <li>Container updates are detected</li>
        <li>Errors occur during monitoring</li>
        <li>Scheduled checks complete (if enabled)</li>
      </ul>
    </div>
    <div class="footer">
      Registry Radar - Docker Image Monitoring<br>
      Automated notification system
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendNotification(config, subject, htmlContent, textContent);
  }
}

