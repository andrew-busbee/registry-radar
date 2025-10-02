import express from 'express';
import { ConfigService } from '../services/configService';
import { AppriseService } from '../services/appriseService';

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
    const requiredTriggers = ['sendSummaryOnScheduledRun', 'sendIndividualReportsOnScheduledRun', 'sendReportsWhenUpdatesFound', 'sendReportsOnErrors'];
    for (const trigger of requiredTriggers) {
      if (typeof config.triggers[trigger] !== 'boolean') {
        return res.status(400).json({ error: `Invalid configuration: ${trigger} must be a boolean` });
      }
    }


    await ConfigService.saveNotificationConfig(config);
    res.json({ message: 'Notification configuration updated successfully' });
  } catch (error) {
    console.error('Error updating notification config:', error);
    res.status(500).json({ error: 'Failed to update notification configuration' });
  }
});


router.post('/test/apprise', async (req, res) => {
  try {
    const config = await ConfigService.getNotificationConfig();
    
    if (!config.apprise?.enabled) {
      return res.status(400).json({ error: 'Apprise notifications are not enabled' });
    }

    const success = await AppriseService.sendTestNotification(config.apprise);
    
    if (success) {
      res.json({ message: 'Apprise test notification sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send Apprise test notification' });
    }
  } catch (error) {
    console.error('Error testing Apprise notification:', error);
    res.status(500).json({ error: 'Failed to test Apprise notification' });
  }
});

export { router as notificationConfigRouter };
