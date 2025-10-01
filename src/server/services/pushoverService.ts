import axios from 'axios';
import { NotificationConfig } from '../types';

export class PushoverService {
  private static readonly API_URL = 'https://api.pushover.net/1/messages.json';

  static async sendNotification(
    config: NotificationConfig['pushover'],
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'emergency' = 'normal'
  ): Promise<boolean> {
    if (!config?.enabled || !config.apiKey || !config.userKey) {
      console.log('Pushover notifications not configured or disabled');
      return false;
    }

    try {
      const payload = {
        token: config.apiKey,
        user: config.userKey,
        title: `Registry Radar: ${title}`,
        message,
        priority: priority === 'low' ? -1 : priority === 'high' ? 1 : priority === 'emergency' ? 2 : 0,
        device: config.devices?.join(','),
      };

      const response = await axios.post(this.API_URL, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data.status === 1) {
        console.log('Pushover notification sent successfully');
        return true;
      } else {
        console.error('Pushover API error:', response.data.errors);
        return false;
      }
    } catch (error) {
      console.error('Failed to send Pushover notification:', error);
      return false;
    }
  }

  static async sendUpdateNotification(
    config: NotificationConfig['pushover'],
    containerName: string,
    image: string,
    tag: string
  ): Promise<boolean> {
    const title = 'Container Update Available';
    const message = `New version available for ${containerName}\nImage: ${image}:${tag}`;
    
    return this.sendNotification(config, title, message, 'normal');
  }

  static async sendErrorNotification(
    config: NotificationConfig['pushover'],
    errorMessage: string,
    container?: string
  ): Promise<boolean> {
    const title = 'Registry Check Error';
    const message = container 
      ? `Error checking ${container}: ${errorMessage}`
      : `Registry check failed: ${errorMessage}`;
    
    return this.sendNotification(config, title, message, 'high');
  }

  static async sendRunNotification(
    config: NotificationConfig['pushover'],
    totalContainers: number,
    updatesFound: number,
    errors: number
  ): Promise<boolean> {
    const title = 'Registry Check Complete';
    const message = `Checked ${totalContainers} containers\nUpdates found: ${updatesFound}\nErrors: ${errors}`;
    
    return this.sendNotification(config, title, message, 'low');
  }

  static async sendIndividualReports(
    config: NotificationConfig['pushover'],
    containers: Array<{name: string, image: string, tag: string, status: string}>
  ): Promise<boolean> {
    const title = 'Individual Container Status Report';
    const message = `Status report for all monitored containers:\n\n${containers.map(container => 
      `${container.name} (${container.image}:${container.tag})\nStatus: ${container.status}`
    ).join('\n\n')}`;
    
    return this.sendNotification(config, title, message, 'normal');
  }

  static async testNotification(config: NotificationConfig['pushover']): Promise<boolean> {
    const title = 'Test Notification';
    const message = 'This is a test notification from Registry Radar to verify your Pushover configuration.';
    
    return this.sendNotification(config, title, message, 'normal');
  }
}
