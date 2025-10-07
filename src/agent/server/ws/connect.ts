import { WebSocketServer, WebSocket } from 'ws';
import { JwtService } from '../services/jwtService';
import { DatabaseService } from '../../../server/services/databaseService';
import { ConfigService } from '../../../server/services/configService';

// Helper function to add containers to monitoring
async function addContainersToMonitoring(containers: any[], agentId: string) {
  try {
    // Get agent name for display
    const agent = await DatabaseService.getAgent(agentId);
    const agentName = agent?.name || agentId;
    
    console.log(`[ws] processing ${containers.length} containers from agent ${agentName}`);
    
    for (const container of containers) {
      // Agent now sends properly structured data with separate image and tag fields
      const imageName = container.image;
      const tag = container.tag || 'latest';
      
      console.log(`[ws] processing container: ${imageName}:${tag}`);
      
      // Always add to monitoring (allow duplicates from different agents)
      await DatabaseService.addContainer({
        name: `${container.name} (from ${agentName})`,
        image_path: imageName,
        tag: tag,
        source_agent_id: agentId
      });
      console.log(`[ws] added container to monitoring: ${imageName}:${tag} from agent ${agentName}`);
    }
  } catch (err) {
    console.error('[ws] error adding containers to monitoring:', err);
  }
}

export function createAgentWSServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request: any, socket: any, head: any) => {
    const { url } = request;
    if (!url || !url.startsWith('/api/agents/connect')) return;

    const params = new URLSearchParams(url.split('?')[1]);
    const authHeader = request.headers['authorization'];
    const token = authHeader?.toString().startsWith('Bearer ')
      ? authHeader.toString().slice(7)
      : params.get('access_token') || '';
    try {
      const decoded: any = JwtService.verifyAccessToken(token);
      const agentId = decoded.sub as string;
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, agentId);
      });
    } catch (e) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket, _req: any, agentId: string) => {
    await DatabaseService.setAgentStatus(agentId, 'online');
    await DatabaseService.touchAgentLastSeen(agentId);

    const heartbeat = setInterval(async () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'heartbeat', ts: Date.now() }));
      await DatabaseService.touchAgentLastSeen(agentId);
    }, 30000);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'containers') {
          console.log(`[ws] received ${message.data.length} containers from agent ${agentId}`);
          await DatabaseService.updateAgentContainers(agentId, message.data);
          
          // Check for new containers to add to monitoring (every time, in case new containers were added)
          await addContainersToMonitoring(message.data, agentId);
        }
        
        await DatabaseService.touchAgentLastSeen(agentId);
      } catch (err) {
        console.error('[ws] error processing message:', err);
        await DatabaseService.touchAgentLastSeen(agentId);
      }
    });

    ws.on('close', async () => {
      clearInterval(heartbeat);
      await DatabaseService.setAgentStatus(agentId, 'offline');
    });
  });

  return wss;
}






