import express from 'express';
import { ConfigService } from '../services/configService';
import { PushoverService } from '../services/pushoverService';
import { DiscordService } from '../services/discordService';

const router = express.Router();

// Get notification configuration
router.get('/config', async (req, res) => {
  try {
    const config = await ConfigService.getNotificationConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching notification config:', error);
    res.status(500).json({ error: 'Failed to fetch notification configuration' });
  }
});

// Update notification configuration
router.put('/config', async (req, res) => {
  try {
    const config = req.body;
    
    // Validate the configuration structure
    if (!config.triggers || typeof config.triggers !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration: triggers required' });
    }

    // Validate trigger settings
    const requiredTriggers = ['onEveryRun', 'onNewUpdates', 'onErrors', 'onManualCheck'];
    for (const trigger of requiredTriggers) {
      if (typeof config.triggers[trigger] !== 'boolean') {
        return res.status(400).json({ error: `Invalid configuration: ${trigger} must be a boolean` });
      }
    }

    // Validate Pushover configuration if provided
    if (config.pushover) {
      if (typeof config.pushover.enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid Pushover configuration: enabled must be a boolean' });
      }
      if (config.pushover.enabled && (!config.pushover.apiKey || !config.pushover.userKey)) {
        return res.status(400).json({ error: 'Invalid Pushover configuration: apiKey and userKey are required when enabled' });
      }
    }

    // Validate Discord configuration if provided
    if (config.discord) {
      if (typeof config.discord.enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid Discord configuration: enabled must be a boolean' });
      }
      if (config.discord.enabled && (!config.discord.webhooks || !Array.isArray(config.discord.webhooks))) {
        return res.status(400).json({ error: 'Invalid Discord configuration: webhooks array is required when enabled' });
      }
      if (config.discord.enabled && config.discord.webhooks.length === 0) {
        return res.status(400).json({ error: 'Invalid Discord configuration: at least one webhook is required when enabled' });
      }
    }

    await ConfigService.saveNotificationConfig(config);
    res.json({ message: 'Notification configuration updated successfully' });
  } catch (error) {
    console.error('Error updating notification config:', error);
    res.status(500).json({ error: 'Failed to update notification configuration' });
  }
});

// Test Pushover notification
router.post('/test/pushover', async (req, res) => {
  try {
    const config = await ConfigService.getNotificationConfig();
    
    if (!config.pushover?.enabled) {
      return res.status(400).json({ error: 'Pushover notifications are not enabled' });
    }

    const success = await PushoverService.testNotification(config.pushover);
    
    if (success) {
      res.json({ message: 'Pushover test notification sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send Pushover test notification' });
    }
  } catch (error) {
    console.error('Error testing Pushover notification:', error);
    res.status(500).json({ error: 'Failed to test Pushover notification' });
  }
});

// Test Discord notification
router.post('/test/discord', async (req, res) => {
  try {
    const config = await ConfigService.getNotificationConfig();
    
    if (!config.discord?.enabled) {
      return res.status(400).json({ error: 'Discord notifications are not enabled' });
    }

    const success = await DiscordService.testNotification(config.discord);
    
    if (success) {
      res.json({ message: 'Discord test notification sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send Discord test notification' });
    }
  } catch (error) {
    console.error('Error testing Discord notification:', error);
    res.status(500).json({ error: 'Failed to test Discord notification' });
  }
});

export { router as notificationConfigRouter };
