import express from 'express';
import { ConfigService } from '../services/configService';
import { RegistryService } from '../services/registryService';
import { NotificationService } from '../services/notificationService';
import { CronService } from '../services/cronService';

const router = express.Router();

// Get container states
router.get('/states', async (req, res) => {
  try {
    const states = await ConfigService.getContainerState();
    res.json(states);
  } catch (error) {
    console.error('Error fetching container states:', error);
    res.status(500).json({ error: 'Failed to fetch container states' });
  }
});

// Check all registries manually
router.post('/check', async (req, res) => {
  try {
    console.log('Manual registry check requested');
    await CronService.runManualCheck();
    res.json({ message: 'Registry check completed' });
  } catch (error) {
    console.error('Error during manual registry check:', error);
    res.status(500).json({ error: 'Failed to check registries' });
  }
});

// Check a specific container
router.post('/check/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid container index' });
    }
    
    const containers = await ConfigService.getContainers();
    
    if (index < 0 || index >= containers.length) {
      return res.status(404).json({ error: 'Container not found' });
    }
    
    const container = containers[index];
    const result = await RegistryService.checkRegistry(container);
    
    // Update the state for this specific container
    const currentStates = await ConfigService.getContainerState();
    const updatedStates = await RegistryService.updateContainerStates([result], currentStates);
    
    // Check if this is a new update (only for existing containers)
    const previousState = currentStates.find(
      s => s.image === result.image && s.tag === result.tag
    );
    
    // Only create notification if this is an existing container with a different SHA
    if (previousState && result.latestSha !== previousState.currentSha) {
      await NotificationService.createUpdateNotification(
        container.name,
        `${result.image}:${result.tag}`,
        result.tag,
        true, // This is a new update since SHA changed
        result.latestAvailableVersion,
        result.trackingMode
      );
    }
    
    await ConfigService.saveContainerState(updatedStates);
    
    res.json(result);
  } catch (error) {
    console.error('Error checking specific container:', error);
    res.status(500).json({ error: 'Failed to check container' });
  }
});

// Reset container state (mark as up to date)
router.post('/reset/:image/:tag', async (req, res) => {
  try {
    const { image, tag } = req.params;
    
    const states = await ConfigService.getContainerState();
    const stateIndex = states.findIndex(s => s.image === image && s.tag === tag);
    
    if (stateIndex === -1) {
      return res.status(404).json({ error: 'Container state not found' });
    }
    
    states[stateIndex].hasUpdate = false;
    states[stateIndex].lastChecked = new Date().toISOString();
    
    await ConfigService.saveContainerState(states);
    
    res.json({ message: 'Container state reset' });
  } catch (error) {
    console.error('Error resetting container state:', error);
    res.status(500).json({ error: 'Failed to reset container state' });
  }
});

// Dismiss container update
router.post('/dismiss/:image/:tag', async (req, res) => {
  try {
    const { image, tag } = req.params;
    
    const states = await ConfigService.getContainerState();
    const stateIndex = states.findIndex(s => s.image === image && s.tag === tag);
    
    if (stateIndex === -1) {
      return res.status(404).json({ error: 'Container state not found' });
    }
    
    // Mark as dismissed with the current latest SHA
    states[stateIndex].dismissed = true;
    states[stateIndex].dismissedSha = states[stateIndex].latestSha;
    states[stateIndex].hasUpdate = false;
    states[stateIndex].lastChecked = new Date().toISOString();
    
    await ConfigService.saveContainerState(states);
    
    res.json({ message: 'Update dismissed' });
  } catch (error) {
    console.error('Error dismissing update:', error);
    res.status(500).json({ error: 'Failed to dismiss update' });
  }
});

export { router as registryRouter };
