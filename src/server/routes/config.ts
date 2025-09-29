import express from 'express';
import { ConfigService } from '../services/configService';
import { ContainerRegistry } from '../types';

const router = express.Router();

// Get all containers
router.get('/containers', async (req, res) => {
  try {
    const containers = await ConfigService.getContainers();
    res.json(containers);
  } catch (error) {
    console.error('Error fetching containers:', error);
    res.status(500).json({ error: 'Failed to fetch containers' });
  }
});

// Add a new container
router.post('/containers', async (req, res) => {
  try {
    const newContainer: ContainerRegistry = req.body;
    
    // Validate required fields
    if (!newContainer.name || !newContainer.imagePath) {
      return res.status(400).json({ error: 'Missing required fields: name and imagePath are required' });
    }
    
    // Set default tag if not provided
    if (!newContainer.tag) {
      newContainer.tag = 'latest';
    }
    
    // Validate imagePath format (basic validation)
    if (typeof newContainer.imagePath !== 'string' || newContainer.imagePath.trim() === '') {
      return res.status(400).json({ error: 'Invalid imagePath format' });
    }
    
    const containers = await ConfigService.getContainers();
    
    // Check for duplicates based on imagePath and tag
    const existingContainer = containers.find(
      c => c.imagePath === newContainer.imagePath && c.tag === newContainer.tag
    );
    
    if (existingContainer) {
      return res.status(400).json({ error: 'Container already exists' });
    }
    
    containers.push(newContainer);
    await ConfigService.saveContainers(containers);
    
    // Create initial container state for new container
    const currentStates = await ConfigService.getContainerState();
    const initialState = {
      image: newContainer.imagePath,
      tag: newContainer.tag || 'latest',
      currentSha: '',
      lastChecked: '', // Empty to indicate never checked
      hasUpdate: false,
      isNew: true, // Mark as new container
      trackingMode: 'latest' as 'latest' | 'version', // Set default tracking mode
    };
    
    currentStates.push(initialState);
    await ConfigService.saveContainerState(currentStates);
    
    res.status(201).json(newContainer);
  } catch (error) {
    console.error('Error adding container:', error);
    res.status(500).json({ error: 'Failed to add container' });
  }
});

// Update a container
router.put('/containers/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const updatedContainer: ContainerRegistry = req.body;
    
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid container index' });
    }
    
    // Validate required fields
    if (!updatedContainer.name || !updatedContainer.imagePath) {
      return res.status(400).json({ error: 'Missing required fields: name and imagePath are required' });
    }
    
    // Set default tag if not provided
    if (!updatedContainer.tag) {
      updatedContainer.tag = 'latest';
    }
    
    // Validate imagePath format (basic validation)
    if (typeof updatedContainer.imagePath !== 'string' || updatedContainer.imagePath.trim() === '') {
      return res.status(400).json({ error: 'Invalid imagePath format' });
    }
    
    const containers = await ConfigService.getContainers();
    
    if (index < 0 || index >= containers.length) {
      return res.status(404).json({ error: 'Container not found' });
    }
    
    containers[index] = updatedContainer;
    await ConfigService.saveContainers(containers);
    
    res.json(updatedContainer);
  } catch (error) {
    console.error('Error updating container:', error);
    res.status(500).json({ error: 'Failed to update container' });
  }
});

// Delete a container
router.delete('/containers/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid container index' });
    }
    
    const containers = await ConfigService.getContainers();
    
    if (index < 0 || index >= containers.length) {
      return res.status(404).json({ error: 'Container not found' });
    }
    
    const deletedContainer = containers.splice(index, 1)[0];
    await ConfigService.saveContainers(containers);
    
    res.json(deletedContainer);
  } catch (error) {
    console.error('Error deleting container:', error);
    res.status(500).json({ error: 'Failed to delete container' });
  }
});

// Bulk import containers
router.post('/containers/bulk', async (req, res) => {
  try {
    const { containers } = req.body;

    if (!Array.isArray(containers) || containers.length === 0) {
      return res.status(400).json({ error: 'Containers array is required and cannot be empty' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < containers.length; i++) {
      try {
        const container = containers[i];
        
        // Validate required fields
        if (!container.name || !container.imagePath) {
          errors.push(`Container ${i + 1}: Missing required fields (name, imagePath)`);
          continue;
        }

        // Validate container structure
        if (typeof container.name !== 'string' || 
            typeof container.imagePath !== 'string') {
          errors.push(`Container ${i + 1}: Invalid field types`);
          continue;
        }

        // Get existing containers for duplicate check and adding
        const existingContainers = await ConfigService.getContainers();
        
        // Check for duplicates
        const isDuplicate = existingContainers.some(existing => 
          existing.imagePath === container.imagePath && 
          existing.tag === (container.tag || 'latest')
        );

        if (isDuplicate) {
          errors.push(`Container ${i + 1}: Duplicate container already exists`);
          continue;
        }

        // Create container object
        const newContainer: ContainerRegistry = {
          name: container.name,
          imagePath: container.imagePath,
          tag: container.tag || 'latest'
        };

        // Add container
        existingContainers.push(newContainer);
        await ConfigService.saveContainers(existingContainers);
        
        // Create initial container state for new container
        const currentStates = await ConfigService.getContainerState();
        const initialState = {
          image: newContainer.imagePath,
          tag: newContainer.tag || 'latest',
          currentSha: '',
          lastChecked: '', // Empty to indicate never checked
          hasUpdate: false,
          isNew: true, // Mark as new container
          trackingMode: 'latest' as 'latest' | 'version', // Set default tracking mode
        };
        
        currentStates.push(initialState);
        await ConfigService.saveContainerState(currentStates);
        
        results.push(newContainer);

      } catch (error) {
        console.error(`Error adding container ${i + 1}:`, error);
        errors.push(`Container ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    res.json({
      message: `Bulk import completed`,
      success: results.length,
      errors: errors.length,
      results: results,
      errorDetails: errors
    });

  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// Export containers
router.get('/containers/export', async (req, res) => {
  try {
    const containers = await ConfigService.getContainers();
    
    // Generate export text
    const exportText = containers
      .map(container => `${container.imagePath}:${container.tag || 'latest'}`)
      .join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="containers.txt"');
    res.send(exportText);
  } catch (error) {
    console.error('Error exporting containers:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

export { router as configRouter };
