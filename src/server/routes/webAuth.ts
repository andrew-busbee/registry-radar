import express from 'express';
import { DatabaseService } from '../services/databaseService';
import { JwtService } from '../../agent/server/services/jwtService';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await DatabaseService.validateWebUserCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = JwtService.issueWebToken(user.username, 24); // 24 hours
    const expiresIn = 24 * 60 * 60; // 24 hours in seconds

    res.json({
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        username: user.username,
        firstLogin: user.first_login
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Change password endpoint (for first login and settings)
router.post('/change-password', async (req, res) => {
  try {
    const { username, password, newUsername, newPassword, confirmPassword } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Current username and password are required' });
    }

    if (!newUsername || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'New username, new password, and confirm password are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Validate current credentials
    const user = await DatabaseService.validateWebUserCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid current credentials' });
    }

    // Check if this is first login
    const isFirstLogin = user.first_login;

    // Update credentials
    await DatabaseService.updateWebUserCredentials(newUsername, newPassword, isFirstLogin);

    // If it was first login, mark it as complete
    if (isFirstLogin) {
      await DatabaseService.markFirstLoginComplete();
    }

    // Issue new token with new username
    const token = JwtService.issueWebToken(newUsername, 24);
    const expiresIn = 24 * 60 * 60;

    res.json({
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        username: newUsername,
        firstLogin: false
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.toString().slice(7);
    const decoded = JwtService.verifyWebToken(token);
    
    const user = await DatabaseService.getWebUser();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: (user as any).username,
      firstLogin: (user as any).first_login
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  // JWT tokens are stateless, so logout is handled client-side
  res.json({ message: 'Logged out successfully' });
});

export { router as webAuthRouter };
