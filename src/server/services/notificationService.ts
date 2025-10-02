import { Notification } from '../types';
import { ConfigService } from './configService';
import { DatabaseService } from './databaseService';
import { PushoverService } from './pushoverService';
import { DiscordService } from './discordService';
import { EmailService } from './emailService';
import { AppriseService } from './appriseService';

export class NotificationService {
  static async getNotifications(): Promise<Notification[]> {
    const notifications = DatabaseService.getNotifications();
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
    
    DatabaseService.addNotification({
      id: newNotification.id,
      type: newNotification.type,
      message: newNotification.message,
      timestamp: newNotification.timestamp,
      container: newNotification.container,
      read: newNotification.read
    });
  }

  static async markAsRead(notificationId: string): Promise<void> {
    DatabaseService.markNotificationAsRead(notificationId);
  }

  static async markAllAsRead(): Promise<void> {
    DatabaseService.markAllNotificationsAsRead();
  }

  static async clearNotifications(): Promise<void> {
    DatabaseService.clearNotifications();
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
    
    console.log(`[NotificationService] sendRunNotification called - isManual: ${isManual}, sendReportsOnManualCheck: ${config.triggers.sendReportsOnManualCheck}, sendSummaryOnScheduledRun: ${config.triggers.sendSummaryOnScheduledRun}`);
    
    // For manual checks, only send if manual check notifications are enabled AND summary is enabled
    if (isManual) {
      if (!config.triggers.sendReportsOnManualCheck) {
        console.log('[NotificationService] Skipping run notification for manual check - manual check notifications disabled');
        return;
      }
      if (!config.triggers.sendSummaryOnScheduledRun) {
        console.log('[NotificationService] Skipping run notification for manual check - summary notifications disabled');
        return;
      }
    }
    
    // For scheduled runs, check the scheduled run trigger
    if (!isManual && !config.triggers.sendSummaryOnScheduledRun) {
      console.log('[NotificationService] Skipping run notification for scheduled run - trigger disabled');
      return;
    }

    console.log('[NotificationService] Sending run notification');
    // Send external notifications for run completion
    await this.sendExternalRunNotifications(totalContainers, updatesFound, errors);
  }

  static async sendIndividualContainerReports(containers: Array<{name: string, image: string, tag: string, status: string}>, isManual: boolean = false): Promise<void> {
    const config = await ConfigService.getNotificationConfig();
    
    console.log(`[NotificationService] sendIndividualContainerReports called - isManual: ${isManual}, sendReportsOnManualCheck: ${config.triggers.sendReportsOnManualCheck}, sendIndividualReportsOnScheduledRun: ${config.triggers.sendIndividualReportsOnScheduledRun}`);
    
    // For manual checks, only send if manual check notifications are enabled AND individual reports are enabled
    if (isManual) {
      if (!config.triggers.sendReportsOnManualCheck) {
        console.log('[NotificationService] Skipping individual reports for manual check - manual check notifications disabled');
        return;
      }
      if (!config.triggers.sendIndividualReportsOnScheduledRun) {
        console.log('[NotificationService] Skipping individual reports for manual check - individual reports disabled');
        return;
      }
    }
    
    // For scheduled runs, check the scheduled run trigger
    if (!isManual && !config.triggers.sendIndividualReportsOnScheduledRun) {
      console.log('[NotificationService] Skipping individual reports for scheduled run - trigger disabled');
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
          if (config.pushover?.enabled) {
            await PushoverService.sendUpdateNotification(config.pushover, containerName, image, tag);
          }
          if (config.discord?.enabled) {
            await DiscordService.sendUpdateNotification(config.discord, containerName, image, tag);
          }
          if (config.email?.enabled) {
            await EmailService.sendUpdateNotification(config.email, containerName, image, tag);
          }
          if (config.apprise?.enabled) {
            await AppriseService.sendUpdateNotification(config.apprise, containerName, image, tag);
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
      if (config.pushover?.enabled) {
        await PushoverService.sendRunNotification(config.pushover, totalContainers, updatesFound, errors);
      }
      if (config.discord?.enabled) {
        await DiscordService.sendRunNotification(config.discord, totalContainers, updatesFound, errors);
      }
      if (config.email?.enabled) {
        await EmailService.sendRunNotification(config.email, totalContainers, updatesFound, errors);
      }
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
      if (config.pushover?.enabled) {
        await PushoverService.sendIndividualReports(config.pushover, containers);
      }
      if (config.discord?.enabled) {
        await DiscordService.sendIndividualReports(config.discord, containers);
      }
      if (config.email?.enabled) {
        await EmailService.sendIndividualReports(config.email, containers);
      }
      if (config.apprise?.enabled) {
        await AppriseService.sendIndividualReports(config.apprise, containers);
      }
    } catch (error) {
      console.error('Error sending individual reports:', error);
    }
  }
}
