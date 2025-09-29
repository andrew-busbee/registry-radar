import express from 'express';
import { NotificationService } from '../services/notificationService';
import { ConfigService } from '../services/configService';

const router = express.Router();

// Clear all notifications (admin endpoint)
router.delete('/notifications', async (req, res) => {
  try {
    await NotificationService.clearNotifications();
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Reset all container states (admin endpoint)
router.delete('/states', async (req, res) => {
  try {
    await ConfigService.saveContainerState([]);
    res.json({ message: 'All container states cleared' });
  } catch (error) {
    console.error('Error clearing container states:', error);
    res.status(500).json({ error: 'Failed to clear container states' });
  }
});

export { router as adminRouter };
