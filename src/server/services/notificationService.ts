import { Notification } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from './configService';
import { PushoverService } from './pushoverService';
import { DiscordService } from './discordService';

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

  static async createUpdateNotification(containerName: string, image: string, tag: string, isNewUpdate: boolean = true): Promise<void> {
    // Create simple notification message
    const message = `New version available for ${containerName} (tag: ${tag})`;

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

  static async sendRunNotification(totalContainers: number, updatesFound: number, errors: number): Promise<void> {
    const config = await ConfigService.getNotificationConfig();
    
    if (!config.triggers.onEveryRun) {
      return;
    }

    // Send external notifications for run completion
    await this.sendExternalRunNotifications(totalContainers, updatesFound, errors);
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

      if (type === 'update' && config.triggers.onNewUpdates) {
        if (containerName && image && tag) {
          // Send update notifications
          if (config.pushover?.enabled) {
            await PushoverService.sendUpdateNotification(config.pushover, containerName, image, tag);
          }
          if (config.discord?.enabled) {
            await DiscordService.sendUpdateNotification(config.discord, containerName, image, tag);
          }
        }
      } else if (type === 'error' && config.triggers.onErrors) {
        if (errorMessage) {
          // Send error notifications
          if (config.pushover?.enabled) {
            await PushoverService.sendErrorNotification(config.pushover, errorMessage, errorContainer);
          }
          if (config.discord?.enabled) {
            await DiscordService.sendErrorNotification(config.discord, errorMessage, errorContainer);
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
    } catch (error) {
      console.error('Error sending run notifications:', error);
    }
  }
}
