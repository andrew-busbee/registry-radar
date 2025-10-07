import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../../agent/server/services/jwtService';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    typ: string;
    iat: number;
    exp: number;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.toString().slice(7);
    
    // Verify the token (works for both web and agent tokens)
    const decoded = JwtService.verifyAccessToken(token) as any;
    
    // Check if this is a web token or agent token
    if (decoded.typ === 'web') {
      // For web users, verify it's specifically a web token
      JwtService.verifyWebToken(token);
    }
    // For agent tokens, the basic verification above is sufficient
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware specifically for web user authentication
export const webAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.toString().slice(7);
    const decoded = JwtService.verifyWebToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Web authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
