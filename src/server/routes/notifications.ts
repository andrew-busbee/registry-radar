import express from 'express';
import { NotificationService } from '../services/notificationService';
import { ConfigService } from '../services/configService';
import { PushoverService } from '../services/pushoverService';
import { DiscordService } from '../services/discordService';
import { EmailService } from '../services/emailService';
import { AppriseService } from '../services/appriseService';

const router = express.Router();

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await NotificationService.getNotifications();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await NotificationService.markAsRead(id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    await NotificationService.markAllAsRead();
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Clear all notifications
router.delete('/', async (req, res) => {
  try {
    await NotificationService.clearNotifications();
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Send test reports
router.post('/test-reports', async (req, res) => {
  try {
    const { reportType } = req.body;
    const config = await ConfigService.getNotificationConfig();

    // Sample data for testing
    const sampleData = {
      containerName: 'sample-app',
      image: 'nginx',
      tag: '1.25.0',
      updatedDate: 'September 15, 2024 (3 days ago)',
      errorMessage: 'Sample error: Unable to connect to registry',
      totalImages: 5,
      updatesFound: 2,
      errors: 1,
      containers: [
        { name: 'sample-app', image: 'nginx:1.25.0', tag: '1.25.0', status: 'Update Available' },
        { name: 'sample-db', image: 'postgres:15', tag: '15.4', status: 'Up to Date' },
        { name: 'sample-api', image: 'node:18', tag: '18.17.0', status: 'Error' }
      ]
    };

    let success = true;
    const errors: string[] = [];

    switch (reportType) {
      case 'update':
        // Test update notification
        if (config.pushover?.enabled) {
          try {
            await PushoverService.sendUpdateNotification(config.pushover, sampleData.containerName, sampleData.image, sampleData.tag);
          } catch (err) {
            errors.push(`Pushover: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.discord?.enabled) {
          try {
            await DiscordService.sendUpdateNotification(config.discord, sampleData.containerName, sampleData.image, sampleData.tag);
          } catch (err) {
            errors.push(`Discord: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.email?.enabled) {
          try {
            await EmailService.sendUpdateNotification(config.email, sampleData.containerName, sampleData.image, sampleData.tag);
          } catch (err) {
            errors.push(`Email: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.apprise?.enabled) {
          try {
            await AppriseService.sendUpdateNotification(config.apprise, sampleData.containerName, sampleData.image, sampleData.tag, sampleData.updatedDate);
          } catch (err) {
            errors.push(`Apprise: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        break;

      case 'error':
        // Test error notification
        if (config.pushover?.enabled) {
          try {
            await PushoverService.sendErrorNotification(config.pushover, sampleData.errorMessage, sampleData.containerName);
          } catch (err) {
            errors.push(`Pushover: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.discord?.enabled) {
          try {
            await DiscordService.sendErrorNotification(config.discord, sampleData.errorMessage, sampleData.containerName);
          } catch (err) {
            errors.push(`Discord: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.email?.enabled) {
          try {
            await EmailService.sendErrorNotification(config.email, sampleData.errorMessage, sampleData.containerName);
          } catch (err) {
            errors.push(`Email: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.apprise?.enabled) {
          try {
            await AppriseService.sendErrorNotification(config.apprise, sampleData.errorMessage, sampleData.containerName);
          } catch (err) {
            errors.push(`Apprise: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        break;

      case 'summary':
        // Test summary notification
        if (config.pushover?.enabled) {
          try {
            await PushoverService.sendRunNotification(config.pushover, sampleData.totalImages, sampleData.updatesFound, sampleData.errors);
          } catch (err) {
            errors.push(`Pushover: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.discord?.enabled) {
          try {
            await DiscordService.sendRunNotification(config.discord, sampleData.totalImages, sampleData.updatesFound, sampleData.errors);
          } catch (err) {
            errors.push(`Discord: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.email?.enabled) {
          try {
            await EmailService.sendRunNotification(config.email, sampleData.totalImages, sampleData.updatesFound, sampleData.errors);
          } catch (err) {
            errors.push(`Email: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.apprise?.enabled) {
          try {
            await AppriseService.sendRunNotification(config.apprise, sampleData.totalImages, sampleData.updatesFound, sampleData.errors);
          } catch (err) {
            errors.push(`Apprise: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        break;

      case 'individual':
        // Test individual reports notification
        if (config.pushover?.enabled) {
          try {
            await PushoverService.sendIndividualReports(config.pushover, sampleData.containers);
          } catch (err) {
            errors.push(`Pushover: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.discord?.enabled) {
          try {
            await DiscordService.sendIndividualReports(config.discord, sampleData.containers);
          } catch (err) {
            errors.push(`Discord: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.email?.enabled) {
          try {
            await EmailService.sendIndividualReports(config.email, sampleData.containers);
          } catch (err) {
            errors.push(`Email: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        if (config.apprise?.enabled) {
          try {
            await AppriseService.sendIndividualReports(config.apprise, sampleData.containers);
          } catch (err) {
            errors.push(`Apprise: ${err instanceof Error ? err.message : 'Unknown error'}`);
            success = false;
          }
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    if (success) {
      res.json({ message: `${reportType} test report sent successfully` });
    } else {
      res.status(207).json({ 
        message: `${reportType} test report sent with some errors`, 
        errors 
      });
    }
  } catch (error) {
    console.error('Error sending test report:', error);
    res.status(500).json({ error: 'Failed to send test report' });
  }
});

export { router as notificationsRouter };
