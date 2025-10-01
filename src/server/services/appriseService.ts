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
          format: 'text',
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
    tag: string
  ): Promise<boolean> {
    const title = 'Image Update Available';
    const body = `A new version is available for the following image:\n\nContainer: ${containerName}\nImage: ${image}`;
    
    return this.sendNotification(config, title, body, 'success');
  }

  static async sendErrorNotification(
    config: AppriseConfig,
    errorMessage: string,
    container?: string
  ): Promise<boolean> {
    const title = 'Registry Check Error';
    const body = container 
      ? `Error checking ${container}:\n${errorMessage}`
      : `Registry check failed:\n${errorMessage}`;
    
    return this.sendNotification(config, title, body, 'error');
  }

  static async sendRunNotification(
    config: AppriseConfig,
    totalImages: number,
    updatesFound: number,
    errors: number
  ): Promise<boolean> {
    const title = 'Check Complete';
    const body = `Scheduled registry check has completed.\n\nTotal Images Checked: ${totalImages}\nUpdates Found: ${updatesFound}\nErrors: ${errors}`;
    
    return this.sendNotification(config, title, body, 'info');
  }

  static async sendIndividualReports(
    config: AppriseConfig,
    containers: Array<{name: string, image: string, tag: string, status: string}>
  ): Promise<boolean> {
    const title = 'Image Status Report';
    const body = `Status report for all monitored images:\n\n${containers.map(container => 
      `${container.name} (${container.image})\nStatus: ${container.status}`
    ).join('\n\n')}`;
    
    return this.sendNotification(config, title, body, 'info');
  }

  static async sendTestNotification(config: AppriseConfig): Promise<boolean> {
    const title = 'Test Notification';
    const body = 'This is a test notification from Registry Radar.\n\nIf you received this message, your Apprise configuration is working correctly!';
    
    return this.sendNotification(config, title, body, 'info');
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
