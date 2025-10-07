import express from 'express';
import { DatabaseService } from '../../../server/services/databaseService';
import { JwtService } from '../services/jwtService';

const router = express.Router();

// Agent heartbeat endpoint
router.post('/heartbeat', async (req, res) => {
  try {
    // Verify authentication
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.toString().slice(7);
    let agentId: string;
    
    try {
      const decoded: any = JwtService.verifyAccessToken(token);
      agentId = decoded.sub as string;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { containers, status = 'online' } = req.body;

    // Validate request data
    if (!Array.isArray(containers)) {
      return res.status(400).json({ error: 'Containers must be an array' });
    }

    // Update agent status
    await DatabaseService.setAgentStatus(agentId, status);
    await DatabaseService.touchAgentLastSeen(agentId);

    // Update agent containers (this will use the improved UPSERT logic we fixed)
    await DatabaseService.updateAgentContainers(agentId, containers);

    // Create monitored containers for new imagePath+agentId combinations
    await DatabaseService.createMonitoredContainersFromAgent(agentId, containers);

    // Get current agent configuration to send back to agent
    const agentConfig = await DatabaseService.getAgentConfig();

    console.log(`[heartbeat] Agent ${agentId} reported ${containers.length} containers with status: ${status}`);

    res.json({ 
      success: true, 
      message: 'Heartbeat received',
      containersReceived: containers.length,
      heartbeatIntervalSeconds: agentConfig.heartbeatIntervalSeconds
    });

  } catch (error) {
    console.error('Error processing agent heartbeat:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

export { router as heartbeatRouter };
