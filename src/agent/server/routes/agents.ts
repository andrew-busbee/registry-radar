import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
      const containers = await DatabaseService.getAgentContainers(r.id);
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
            status: c.status
          })),
          stopped: stoppedContainers.map((c: any) => ({
            id: c.container_id,
            name: c.name,
            image: c.image,
            status: c.status
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

  await DatabaseService.createAgent({ id: agentId, name: body.name, tags: body.tags ? JSON.stringify(body.tags) : null });
  await DatabaseService.upsertAgentSecrets(agentId, enrollHash, null);

  const baseUrl = getPublicUrl(req);
  const imageRef = 'ghcr.io/andrewbusbee/registry-radar-agent:0.1.0-beta.1';
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
      - /var/run/docker.sock:/var/run/docker.sock:ro
    healthcheck:
      test: ["CMD", "node", "/app/dist/healthcheck.js"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
`;

  const resp: CreateAgentResponse = {
    agentId,
    enrollToken,
    composeYaml,
  };
  res.status(201).json(resp);
});


