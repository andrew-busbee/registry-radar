import express from 'express';
import { ConfigService } from '../services/configService';
import { CronService } from '../services/cronService';

const router = express.Router();

// Get cron configuration
router.get('/config', async (req, res) => {
  try {
    const config = await ConfigService.getCronConfig();
    const isRunning = CronService.isRunning();
    
    res.json({
      ...config,
      isRunning,
    });
  } catch (error) {
    console.error('Error fetching cron config:', error);
    res.status(500).json({ error: 'Failed to fetch cron configuration' });
  }
});

// Update cron schedule
router.put('/config/schedule', async (req, res) => {
  try {
    const { schedule } = req.body;
    
    if (!schedule || typeof schedule !== 'string') {
      return res.status(400).json({ error: 'Invalid schedule format' });
    }
    
    // Basic validation for cron expression (5 fields)
    const cronFields = schedule.trim().split(/\s+/);
    if (cronFields.length !== 5) {
      return res.status(400).json({ error: 'Invalid cron format. Expected 5 fields: minute hour day month weekday' });
    }
    
    await CronService.updateSchedule(schedule);
    
    res.json({ message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('Error updating cron schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Toggle cron enabled/disabled
router.put('/config/enabled', async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled must be a boolean value' });
    }
    
    await CronService.toggleCron(enabled);
    
    res.json({ message: `Cron ${enabled ? 'enabled' : 'disabled'} successfully` });
  } catch (error) {
    console.error('Error toggling cron:', error);
    res.status(500).json({ error: 'Failed to toggle cron' });
  }
});

// Get cron status
router.get('/status', async (req, res) => {
  try {
    const isRunning = CronService.isRunning();
    const config = await ConfigService.getCronConfig();
    
    res.json({
      isRunning,
      enabled: config.enabled,
      schedule: config.schedule,
      nextRun: isRunning ? 'Scheduled' : 'Not scheduled',
    });
  } catch (error) {
    console.error('Error fetching cron status:', error);
    res.status(500).json({ error: 'Failed to fetch cron status' });
  }
});

// Test cron job manually
router.post('/test', async (req, res) => {
  try {
    console.log('Manual cron test triggered');
    await CronService.runManualCheck();
    res.json({ message: 'Manual cron test completed successfully' });
  } catch (error) {
    console.error('Error running manual cron test:', error);
    res.status(500).json({ error: 'Failed to run manual cron test' });
  }
});

export { router as cronRouter };
