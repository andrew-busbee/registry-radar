import express from 'express';
import { AuthService } from '../services/authService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * Login endpoint
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Authenticate user
    const result = await AuthService.authenticateWithRememberMe(
      username, 
      password, 
      rememberMe === true
    );

    if (!result.success) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set cookie with JWT token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000 // 30 days or 7 days
    };

    res.cookie('authToken', result.token, cookieOptions);

    res.json({
      message: 'Login successful',
      isFirstLogin: result.isFirstLogin,
      username: username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Logout endpoint
 */
router.post('/logout', (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Change password endpoint (for first login)
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentUsername, currentPassword, newUsername, newPassword } = req.body;

    // Validate input
    if (!currentUsername || !currentPassword || !newUsername || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Validate new username length
    if (newUsername.length < 3) {
      return res.status(400).json({ error: 'New username must be at least 3 characters long' });
    }

    // Block weak default credentials
    if (newUsername.toLowerCase() === 'user') {
      return res.status(400).json({ error: 'Username "user" is not allowed. Please choose a different username.' });
    }

    if (newPassword.toLowerCase() === 'password') {
      return res.status(400).json({ error: 'Password "password" is not allowed. Please choose a stronger password.' });
    }

    // Change password
    const result = await AuthService.changePassword(
      currentUsername,
      currentPassword,
      newUsername,
      newPassword
    );

    if (!result.success) {
      return res.status(401).json({ error: 'Invalid current credentials' });
    }

    // Update the auth cookie with new token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.cookie('authToken', result.token, cookieOptions);

    res.json({
      message: 'Password changed successfully',
      username: newUsername
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

/**
 * Get current user info
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    res.json({
      username: req.user?.username,
      isFirstLogin: req.user?.isFirstLogin
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * Verify token endpoint
 */
router.get('/verify', authenticateToken, (req, res) => {
  try {
    console.log('🔍 Token verification successful for user:', req.user?.username);
    res.json({
      valid: true,
      username: req.user?.username,
      isFirstLogin: req.user?.isFirstLogin
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

export { router as authRouter };
