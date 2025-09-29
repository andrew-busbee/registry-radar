import express from 'express';
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
import { authRouter } from './routes/auth';
import { InitService } from './services/initService';
import { UserService } from './services/userService';
import { authenticateToken } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/config', authenticateToken, configRouter);
app.use('/api/registry', authenticateToken, registryRouter);
app.use('/api/cron', authenticateToken, cronRouter);
app.use('/api/notifications', authenticateToken, notificationsRouter);
app.use('/api/notification-config', authenticateToken, notificationConfigRouter);
app.use('/api/admin', authenticateToken, adminRouter);

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Initialize and start server
Promise.all([
  InitService.initialize(),
  UserService.initialize()
]).then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Registry Radar server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to view the application`);
    console.log(`🔐 Default login: username=user, password=password`);
  });
}).catch((error) => {
  console.error('Failed to start Registry Radar:', error);
  process.exit(1);
});
