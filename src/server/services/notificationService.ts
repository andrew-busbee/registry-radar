import { Notification } from '../types';
import { ConfigService } from './configService';
import { DatabaseService } from './databaseService';
import { AppriseService } from './appriseService';

export class NotificationService {
  static async getNotifications(): Promise<Notification[]> {
    const notifications = await DatabaseService.getNotifications();
    return notifications.map((notification: any) => ({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      timestamp: notification.timestamp,
      container: notification.container,
      read: Boolean(notification.read)
    }));
  }

  static async addNotification(notification: Omit<Notification, 'id'>): Promise<void> {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    
    await DatabaseService.addNotification({
      id: newNotification.id,
      type: newNotification.type,
      message: newNotification.message,
      timestamp: newNotification.timestamp,
      container: newNotification.container,
      read: newNotification.read
    });
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await DatabaseService.markNotificationAsRead(notificationId);
  }

  static async markAllAsRead(): Promise<void> {
    await DatabaseService.markAllNotificationsAsRead();
  }

  static async clearNotifications(): Promise<void> {
    await DatabaseService.clearNotifications();
  }

  static async createUpdateNotification(containerName: string, image: string, tag: string, isNewUpdate: boolean = true, customMessage?: string): Promise<void> {
    console.log(`[NotificationService] createUpdateNotification called for ${containerName} (${image}:${tag})`);
    
    // Create notification message (use custom message if provided, otherwise default)
    const message = customMessage || `New version available for ${containerName} (tag: ${tag})`;
    console.log(`[NotificationService] Creating notification with message: ${message}`);

    try {
      // Create internal notification
      await this.addNotification({
        type: 'update',
        message,
        timestamp: new Date().toISOString(),
        container: image,
        read: false,
      });
      console.log(`[NotificationService] Internal notification created successfully for ${containerName}`);

      // Send external notifications for all updates (both new and existing)
      await this.sendExternalNotifications('update', containerName, image, tag);
      console.log(`[NotificationService] External notifications processed for ${containerName}`);
    } catch (error) {
      console.error(`[NotificationService] Error creating notification for ${containerName}:`, error);
      throw error;
    }
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
    
    console.log(`[NotificationService] sendRunNotification called - isManual: ${isManual}, sendSummaryOnScheduledRun: ${config.triggers.sendSummaryOnScheduledRun}`);
    
    // Always send run notifications if the trigger is enabled (works for both manual and scheduled)
    if (!config.triggers.sendSummaryOnScheduledRun) {
      console.log('[NotificationService] Skipping run notification - summary notifications disabled');
      return;
    }

    console.log('[NotificationService] Sending run notification');
    // Send external notifications for run completion
    await this.sendExternalRunNotifications(totalContainers, updatesFound, errors);
  }

  static async sendIndividualContainerReports(containers: Array<{name: string, image: string, tag: string, status: string}>, isManual: boolean = false): Promise<void> {
    const config = await ConfigService.getNotificationConfig();
    
    console.log(`[NotificationService] sendIndividualContainerReports called - isManual: ${isManual}, sendIndividualReportsOnScheduledRun: ${config.triggers.sendIndividualReportsOnScheduledRun}`);
    
    // Always send individual reports if the trigger is enabled (works for both manual and scheduled)
    if (!config.triggers.sendIndividualReportsOnScheduledRun) {
      console.log('[NotificationService] Skipping individual reports - individual reports disabled');
      return;
    }

    console.log('[NotificationService] Sending individual container reports');
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
          if (config.apprise?.enabled) {
            await AppriseService.sendUpdateNotification(config.apprise, containerName, image, tag);
          }
        }
      } else if (type === 'error' && config.triggers.sendReportsOnErrors) {
        if (errorMessage) {
          // Send error notifications
          if (config.apprise?.enabled) {
            await AppriseService.sendErrorNotification(config.apprise, errorMessage, errorContainer);
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
      if (config.apprise?.enabled) {
        await AppriseService.sendRunNotification(config.apprise, totalContainers, updatesFound, errors);
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
      if (config.apprise?.enabled) {
        await AppriseService.sendIndividualReports(config.apprise, containers);
      }
    } catch (error) {
      console.error('Error sending individual reports:', error);
    }
  }
}
