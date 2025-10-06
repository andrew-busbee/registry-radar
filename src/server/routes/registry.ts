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
    
    // Get the updated state to check if it's new
    const updatedState = updatedStates.find(
      s => s.image === result.image && s.tag === result.tag
    );
    
    // Check if this is a new update (only for existing containers)
    const previousState = currentStates.find(
      s => s.image === result.image && s.tag === result.tag
    );
    
    // Only create notification if:
    // 1. Previous state exists AND
    // 2. Previous state had a SHA (not first check) AND
    // 3. SHA has changed AND
    // 4. Not marked as new container
    const wasNeverChecked = !previousState || !previousState.currentSha || previousState.currentSha === '';
    if (previousState && !wasNeverChecked && !RegistryService.compareShas(result.latestSha, previousState.currentSha) && !updatedState?.isNew) {
      await NotificationService.createUpdateNotification(
        container.name,
        result.image,
        result.tag,
        true // This is a new update since SHA changed
      );
      console.log(`Update notification created for ${container.name}`);
    } else if (wasNeverChecked) {
      console.log(`Skipping notification for first check of ${container.name} (establishing baseline)`);
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
    const normalizedTag = (tag || 'latest');
    const stateIndex = states.findIndex(s => s.image === image && (s.tag || 'latest') === normalizedTag);
    
    if (stateIndex === -1) {
      return res.status(404).json({ error: 'Container state not found' });
    }
    
    // True baseline reset: accept the current online SHA as baseline if available
    const state = states[stateIndex];
    if (state.latestSha && state.latestSha !== '') {
      state.currentSha = state.latestSha;
    }
    state.hasUpdate = false;
    state.hasNewerTag = false;
    state.latestAvailableTag = undefined;
    state.latestAvailableUpdated = undefined;
    state.updateAcknowledged = false;
    state.lastChecked = new Date().toISOString();
    
    await ConfigService.saveContainerState(states);
    
    res.json({ message: 'Container baseline reset' });
  } catch (error) {
    console.error('Error resetting container state:', error);
    res.status(500).json({ error: 'Failed to reset container state' });
  }
});


export { router as registryRouter };
