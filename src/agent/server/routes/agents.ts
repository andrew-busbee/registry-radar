import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../../../server/services/databaseService';
import { CreateAgentRequest, CreateAgentResponse } from '../../shared/types';

export const agentsRouter = Router();

function getPublicUrl(req: any): string {
  // Prefer PUBLIC_URL, fallback to current host
  const envUrl = process.env.PUBLIC_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

agentsRouter.get('/', async (_req, res) => {
  const rows = await DatabaseService.listAgents();
  
  const agentsWithContainers = await Promise.all(
    rows.map(async (r: any) => {
      const containers = await DatabaseService.getAgentContainersWithStatus(r.id);
      const runningContainers = containers.filter((c: any) => c.status === 'running');
      const stoppedContainers = containers.filter((c: any) => c.status !== 'running');
      
      return {
        id: r.id,
        name: r.name,
        tags: r.tags ? JSON.parse(r.tags) : [],
        host: r.host || undefined,
        version: r.version || undefined,
        status: r.status as 'online' | 'offline' | 'disabled',
        createdAt: r.created_at,
        lastSeenAt: r.last_seen_at || undefined,
        containers: {
          running: runningContainers.map((c: any) => ({
            id: c.container_id,
            name: c.name,
            image: c.image,
            tag: c.tag || 'latest',
            status: c.status,
            updateStatus: c.update_status || 'unknown',
            lastChecked: c.last_checked,
            hasUpdate: c.has_update || false
          })),
          stopped: stoppedContainers.map((c: any) => ({
            id: c.container_id,
            name: c.name,
            image: c.image,
            tag: c.tag || 'latest',
            status: c.status,
            updateStatus: c.update_status || 'unknown',
            lastChecked: c.last_checked,
            hasUpdate: c.has_update || false
          }))
        }
      };
    })
  );
  
  res.json(agentsWithContainers);
});

agentsRouter.post('/', async (req, res) => {
  const body = req.body as CreateAgentRequest;
  if (!body?.name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  const agentId = randomUUID();
  const enrollToken = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  const enrollHash = await bcrypt.hash(enrollToken, 10);

  // Create host display string
  let hostDisplay = body.name;
  if (body.ipAddress && body.ipAddress.trim()) {
    hostDisplay = `${body.name} (${body.ipAddress.trim()})`;
  }

  await DatabaseService.createAgent({ id: agentId, name: body.name, tags: body.tags ? JSON.stringify(body.tags) : null, host: hostDisplay });
  await DatabaseService.upsertAgentSecrets(agentId, enrollHash, null);

  const baseUrl = getPublicUrl(req);
  const imageRef = 'ghcr.io/andrewbusbee/registry-radar-agent:latest';
  const composeYaml = `services:
  registry-radar-agent:
    image: ${imageRef}
    container_name: registry-radar-agent
    restart: unless-stopped
    environment:
      - SERVER_URL=${baseUrl}
      - AGENT_ID=${agentId}
      - AGENT_ENROLL_TOKEN=${enrollToken}
      - AGENT_LOG_LEVEL=info
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
`;

  const resp: CreateAgentResponse = {
    agentId,
    enrollToken,
    composeYaml,
  };
  res.status(201).json(resp);
});

// Agent configuration endpoints (must come before /:id routes)
agentsRouter.get('/config', async (_req, res) => {
  try {
    const config = await DatabaseService.getAgentConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching agent config:', error);
    res.status(500).json({ error: 'Failed to fetch agent configuration' });
  }
});

agentsRouter.put('/config', async (req, res) => {
  try {
    const { heartbeatIntervalSeconds } = req.body;
    
    // Validate heartbeat interval
    if (typeof heartbeatIntervalSeconds !== 'number' || heartbeatIntervalSeconds < 30 || heartbeatIntervalSeconds > 1800) {
      return res.status(400).json({ 
        error: 'Heartbeat interval must be a number between 30 and 1800 seconds (30 seconds to 30 minutes)' 
      });
    }

    await DatabaseService.updateAgentConfig({ heartbeatIntervalSeconds });
    res.json({ message: 'Agent configuration updated successfully' });
  } catch (error) {
    console.error('Error updating agent config:', error);
    res.status(500).json({ error: 'Failed to update agent configuration' });
  }
});

agentsRouter.put('/:id', async (req, res) => {
  const agentId = req.params.id;
  const { name, host } = req.body;
  
  if (!agentId) {
    return res.status(400).json({ error: 'Missing agent ID' });
  }
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or invalid agent name' });
  }

  try {
    await DatabaseService.updateAgent(agentId, { name: name.trim(), host: host || null });
    res.json({ message: 'Agent updated successfully' });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

agentsRouter.delete('/:id', async (req, res) => {
  const agentId = req.params.id;
  if (!agentId) {
    return res.status(400).json({ error: 'Missing agent ID' });
  }

  try {
    // Delete agent and all related data
    await DatabaseService.deleteAgent(agentId);
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

