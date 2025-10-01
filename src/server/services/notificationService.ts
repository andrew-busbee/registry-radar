import { Notification } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from './configService';
import { PushoverService } from './pushoverService';
import { DiscordService } from './discordService';
import { EmailService } from './emailService';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'notifications.json');

export class NotificationService {
  private static async ensureDataDir(): Promise<void> {
    const dataDir = path.dirname(NOTIFICATIONS_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  static async getNotifications(): Promise<Notification[]> {
    await this.ensureDataDir();
    try {
      const content = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }

  static async saveNotifications(notifications: Notification[]): Promise<void> {
    await this.ensureDataDir();
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
  }

  static async addNotification(notification: Omit<Notification, 'id'>): Promise<void> {
    const notifications = await this.getNotifications();
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    
    notifications.unshift(newNotification); // Add to beginning
    notifications.splice(100); // Keep only last 100 notifications
    
    await this.saveNotifications(notifications);
  }

  static async markAsRead(notificationId: string): Promise<void> {
    const notifications = await this.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.saveNotifications(notifications);
    }
  }

  static async markAllAsRead(): Promise<void> {
    const notifications = await this.getNotifications();
    notifications.forEach(n => n.read = true);
    await this.saveNotifications(notifications);
  }

  static async clearNotifications(): Promise<void> {
    await this.saveNotifications([]);
  }

  static async createUpdateNotification(containerName: string, image: string, tag: string, isNewUpdate: boolean = true, customMessage?: string): Promise<void> {
    // Create notification message (use custom message if provided, otherwise default)
    const message = customMessage || `New version available for ${containerName} (tag: ${tag})`;

    // Create internal notification
    await this.addNotification({
      type: 'update',
      message,
      timestamp: new Date().toISOString(),
      container: image,
      read: false,
    });

    // Send external notifications for all updates (both new and existing)
    await this.sendExternalNotifications('update', containerName, image, tag);
  }

  static async createErrorNotification(message: string, container?: string): Promise<void> {
    // Create internal notification
    await this.addNotification({
      type: 'error',
      message,
      timestamp: new Date().toISOString(),
      container,
      read: false,
    });

    // Send external notifications
    await this.sendExternalNotifications('error', undefined, undefined, undefined, message, container);
  }

  static async sendRunNotification(totalContainers: number, updatesFound: number, errors: number, isManual: boolean = false): Promise<void> {
    const config = await ConfigService.getNotificationConfig();
    
    // For manual checks, only send if manual check notifications are enabled
    if (isManual && !config.triggers.sendReportsOnManualCheck) {
      return;
    }
    
    // For scheduled runs, check the scheduled run trigger
    if (!isManual && !config.triggers.sendSummaryOnScheduledRun) {
      return;
    }

    // Send external notifications for run completion
    await this.sendExternalRunNotifications(totalContainers, updatesFound, errors);
  }

  static async sendIndividualContainerReports(containers: Array<{name: string, image: string, tag: string, status: string}>, isManual: boolean = false): Promise<void> {
    const config = await ConfigService.getNotificationConfig();
    
    // For manual checks, only send if manual check notifications are enabled
    if (isManual && !config.triggers.sendReportsOnManualCheck) {
      return;
    }
    
    // For scheduled runs, check the scheduled run trigger
    if (!isManual && !config.triggers.sendIndividualReportsOnScheduledRun) {
      return;
    }

    // Send individual container status reports
    await this.sendExternalIndividualReports(containers);
  }

  private static async sendExternalNotifications(
    type: 'update' | 'error',
    containerName?: string,
    image?: string,
    tag?: string,
    errorMessage?: string,
    errorContainer?: string
  ): Promise<void> {
    try {
      const config = await ConfigService.getNotificationConfig();

      if (type === 'update' && config.triggers.sendReportsWhenUpdatesFound) {
        if (containerName && image && tag) {
          // Send update notifications
          if (config.pushover?.enabled) {
            await PushoverService.sendUpdateNotification(config.pushover, containerName, image, tag);
          }
          if (config.discord?.enabled) {
            await DiscordService.sendUpdateNotification(config.discord, containerName, image, tag);
          }
          if (config.email?.enabled) {
            await EmailService.sendUpdateNotification(config.email, containerName, image, tag);
          }
        }
      } else if (type === 'error' && config.triggers.sendReportsOnErrors) {
        if (errorMessage) {
          // Send error notifications
          if (config.pushover?.enabled) {
            await PushoverService.sendErrorNotification(config.pushover, errorMessage, errorContainer);
          }
          if (config.discord?.enabled) {
            await DiscordService.sendErrorNotification(config.discord, errorMessage, errorContainer);
          }
          if (config.email?.enabled) {
            await EmailService.sendErrorNotification(config.email, errorMessage, errorContainer);
          }
        }
      }
    } catch (error) {
      console.error('Error sending external notifications:', error);
    }
  }

  private static async sendExternalRunNotifications(
    totalContainers: number,
    updatesFound: number,
    errors: number
  ): Promise<void> {
    try {
      const config = await ConfigService.getNotificationConfig();

      // Send run completion notifications
      if (config.pushover?.enabled) {
        await PushoverService.sendRunNotification(config.pushover, totalContainers, updatesFound, errors);
      }
      if (config.discord?.enabled) {
        await DiscordService.sendRunNotification(config.discord, totalContainers, updatesFound, errors);
      }
      if (config.email?.enabled) {
        await EmailService.sendRunNotification(config.email, totalContainers, updatesFound, errors);
      }
    } catch (error) {
      console.error('Error sending run notifications:', error);
    }
  }

  private static async sendExternalIndividualReports(
    containers: Array<{name: string, image: string, tag: string, status: string}>
  ): Promise<void> {
    try {
      const config = await ConfigService.getNotificationConfig();

      // Send individual container status reports
      if (config.pushover?.enabled) {
        await PushoverService.sendIndividualReports(config.pushover, containers);
      }
      if (config.discord?.enabled) {
        await DiscordService.sendIndividualReports(config.discord, containers);
      }
      if (config.email?.enabled) {
        await EmailService.sendIndividualReports(config.email, containers);
      }
    } catch (error) {
      console.error('Error sending individual reports:', error);
    }
  }
}
