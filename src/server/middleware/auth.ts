import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

// Extend Express Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        isFirstLogin: boolean;
      };
    }
  }
}

/**
 * Authentication middleware to protect routes
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from Authorization header or cookie
    let token: string | undefined;
    
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no token in header, check cookies
    if (!token && req.cookies) {
      token = req.cookies.authToken;
    }

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify token
    const userInfo = await AuthService.getUserFromToken(token);
    
    if (!userInfo) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Add user info to request
    req.user = userInfo;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user needs to change password (first login)
 */
export const requirePasswordChange = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.isFirstLogin) {
    res.status(403).json({ 
      error: 'Password change required', 
      requiresPasswordChange: true 
    });
    return;
  }
  next();
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token && req.cookies) {
      token = req.cookies.authToken;
    }

    if (token) {
      const userInfo = await AuthService.getUserFromToken(token);
      if (userInfo) {
        req.user = userInfo;
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if auth fails
  }
};

