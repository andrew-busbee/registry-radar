import { NotificationConfig } from '../types';

export interface AppriseChannel {
  name: string;
  url: string;
  enabled: boolean;
}

export interface AppriseConfig {
  enabled: boolean;
  channels: AppriseChannel[];
}

// Common message templates for Apprise notifications
export class AppriseTemplates {
  private static readonly BRAND_HEADER = '## 📡 Registry Radar';
  private static readonly BRAND_FOOTER = '---\n*Registry Radar - Simple Docker Image Monitoring*';
  
  static updateAvailable(containerName: string, image: string, tag: string, updatedDate?: string): { title: string; body: string } {
    return {
      title: '📡 Registry Radar: Monitored Image Update Available',
      body: `Name: ${containerName}
Image: ${image}:${tag}
${updatedDate ? `Image Updated: ${updatedDate}` : ''}

---
Registry Radar - Simple Docker Image Monitoring`
    };
  }

  static errorOccurred(errorMessage: string, container?: string): { title: string; body: string } {
    return {
      title: '📡 Registry Radar Image Check Error',
      body: `An error occurred during the registry check:

Name: ${container || 'N/A'}
Error Details:
${errorMessage}

Please check your configuration and try again.

---
Registry Radar - Simple Docker Image Monitoring`
    };
  }

  static checkComplete(totalImages: number, updatesFound: number, errors: number): { title: string; body: string } {
    return {
      title: '📡 Registry Radar Check Complete',
      body: `Scheduled registry check has completed with the following results:

Total Images Checked: ${totalImages}
Updates Found: ${updatesFound}
Errors: ${errors}

${updatesFound > 0 ? '⚠️ Image Updates Available' : '✅ All Good: No updates found for your monitored images.'}

---
Registry Radar - Simple Docker Image Monitoring`
    };
  }

  static individualReport(containers: Array<{name: string, image: string, tag: string, status: string}>): { title: string; body: string } {
    const containerList = containers.map(container => 
      `${container.name}\n- Image: ${container.image}:${container.tag}\n- Status: ${container.status}`
    ).join('\n\n');

    return {
      title: '📡 Registry Radar Image Status Report',
      body: `Status report for all monitored images:

${containerList}

---
Registry Radar - Simple Docker Image Monitoring`
    };
  }

  static testNotification(): { title: string; body: string } {
    return {
      title: '📡 Registry Radar Test Notification',
      body: `This is a test notification from Registry Radar.

✅ Success: If you received this message, your Apprise configuration is working correctly!

Configuration Details:
- Service: Apprise
- Format: Plain Text
- Timestamp: ${new Date().toLocaleString()}

---
Registry Radar - Simple Docker Image Monitoring`
    };
  }
}

export class AppriseService {
  private static readonly APPRISE_URL = process.env.APPRISE_URL || 'http://apprise:8000';
  private static readonly TIMEOUT = 10000; // 10 seconds

  static async sendNotification(
    config: AppriseConfig,
    title: string,
    body: string,
    notificationType: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<boolean> {
    if (!config || !config.enabled) {
      console.log('[Apprise] Notifications disabled or config missing');
      return false;
    }

    const enabledChannels = config.channels.filter(channel => channel.enabled);
    if (enabledChannels.length === 0) {
      console.log('[Apprise] No enabled channels configured');
      return false;
    }

    const urls = enabledChannels.map(channel => channel.url);

    try {
      console.log(`[Apprise] Sending notification to ${urls.length} channels`);
      
      const response = await fetch(`${this.APPRISE_URL}/notify/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Registry-Radar/1.0'
        },
        body: JSON.stringify({
          urls: urls,
          title: title,
          body: body,
          format: 'text', // Using plain text for better Discord compatibility
          tag: notificationType
        }),
        signal: AbortSignal.timeout(this.TIMEOUT)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Apprise] HTTP ${response.status}: ${errorText}`);
        return false;
      }

      const result = await response.json();
      console.log(`[Apprise] Notification sent successfully:`, result);
      return true;

    } catch (error) {
      console.error('[Apprise] Failed to send notification:', error);
      return false;
    }
  }

  static async sendUpdateNotification(
    config: AppriseConfig,
    containerName: string,
    image: string,
    tag: string,
    updatedDate?: string
  ): Promise<boolean> {
    const template = AppriseTemplates.updateAvailable(containerName, image, tag, updatedDate);
    return this.sendNotification(config, template.title, template.body, 'success');
  }

  static async sendErrorNotification(
    config: AppriseConfig,
    errorMessage: string,
    container?: string
  ): Promise<boolean> {
    const template = AppriseTemplates.errorOccurred(errorMessage, container);
    return this.sendNotification(config, template.title, template.body, 'error');
  }

  static async sendRunNotification(
    config: AppriseConfig,
    totalImages: number,
    updatesFound: number,
    errors: number
  ): Promise<boolean> {
    const template = AppriseTemplates.checkComplete(totalImages, updatesFound, errors);
    return this.sendNotification(config, template.title, template.body, 'info');
  }

  static async sendIndividualReports(
    config: AppriseConfig,
    containers: Array<{name: string, image: string, tag: string, status: string}>
  ): Promise<boolean> {
    const template = AppriseTemplates.individualReport(containers);
    return this.sendNotification(config, template.title, template.body, 'info');
  }

  static async sendTestNotification(config: AppriseConfig): Promise<boolean> {
    const template = AppriseTemplates.testNotification();
    return this.sendNotification(config, template.title, template.body, 'info');
  }

  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.APPRISE_URL}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch (error) {
      console.error('[Apprise] Connection test failed:', error);
      return false;
    }
  }
}
