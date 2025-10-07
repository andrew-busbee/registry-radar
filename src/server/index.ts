import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { configRouter } from './routes/config';
import { registryRouter } from './routes/registry';
import { cronRouter } from './routes/cron';
import { notificationsRouter } from './routes/notifications';
import { notificationConfigRouter } from './routes/notificationConfig';
import { adminRouter } from './routes/admin';
import { InitService } from './services/initService';
import { agentsRouter } from '../agent/server/routes/agents';
import http from 'http';
import { agentAuthRouter } from '../agent/server/routes/auth';
import { jwksRouter } from '../agent/server/routes/jwks';
import { heartbeatRouter } from '../agent/server/routes/heartbeat';
import { DatabaseService } from './services/databaseService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false, // Allow screenshots
  crossOriginOpenerPolicy: false, // Allow screenshots
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/config', configRouter);
app.use('/api/registry', registryRouter);
app.use('/api/cron', cronRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/notification-config', notificationConfigRouter);
app.use('/api/admin', adminRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/agent-auth', agentAuthRouter);
app.use('/.well-known/jwks.json', jwksRouter);
app.use('/api/agent', heartbeatRouter);

// Serve React app for all non-API routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize database first
    console.log('🗄️  Initializing SQLite database...');
    await DatabaseService.initialize();
    console.log('✅ Database initialized successfully');
    
    // Clean up any duplicate agent containers from previous runs
    console.log('🧹 Cleaning up duplicate agent containers...');
    await DatabaseService.cleanupDuplicateAgentContainers();
    console.log('✅ Agent container cleanup completed');
    
    // Clean up any duplicate container states from previous runs
    console.log('🧹 Cleaning up duplicate container states...');
    await DatabaseService.cleanupDuplicateContainerStates();
    console.log('✅ Container state cleanup completed');
    
    // Initialize other services
    await InitService.initialize();
    
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`🚀 Registry Radar server running on port ${PORT}`);
      console.log(`📱 Open http://localhost:${PORT} to view the application`);
      
      // Log Docker Hub authentication status
      const dockerHubUsername = process.env.DOCKERHUB_USERNAME;
      const dockerHubPassword = process.env.DOCKERHUB_PASSWORD;
      
      if (dockerHubUsername && dockerHubPassword) {
        console.log(`🔐 Docker Hub: Authenticated as "${dockerHubUsername}" (200 pulls/6hr or unlimited if Pro)`);
      } else {
        console.log(`⚠️  Docker Hub: Anonymous mode (100 pulls/6hr) - Add DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD to increase limit`);
      }
    });
  } catch (error) {
    console.error('Failed to start Registry Radar:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  DatabaseService.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  DatabaseService.close();
  process.exit(0);
});

startServer();
