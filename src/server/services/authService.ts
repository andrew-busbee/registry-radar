import jwt from 'jsonwebtoken';
import { UserService } from './userService';

export interface JWTPayload {
  username: string;
  isFirstLogin: boolean;
  iat: number;
  exp: number;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'registry-radar-secret-key-change-in-production';
  private static readonly DEFAULT_EXPIRY = '7d'; // 7 days
  private static readonly REMEMBER_ME_EXPIRY = '30d'; // 30 days

  /**
   * Generate JWT token
   */
  static generateToken(username: string, isFirstLogin: boolean, rememberMe: boolean = false): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      username,
      isFirstLogin
    };

    const expiresIn = rememberMe ? this.REMEMBER_ME_EXPIRY : this.DEFAULT_EXPIRY;
    
    return jwt.sign(payload, this.JWT_SECRET, { 
      expiresIn,
      issuer: 'registry-radar',
      audience: 'registry-radar-client'
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'registry-radar',
        audience: 'registry-radar-client'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  /**
   * Authenticate user with username and password
   */
  static async authenticate(username: string, password: string): Promise<{ success: boolean; isFirstLogin: boolean; token?: string }> {
    try {
      const isValid = await UserService.verifyCredentials(username, password);
      
      if (!isValid) {
        return { success: false, isFirstLogin: false };
      }

      const isFirstLogin = await UserService.isFirstLogin();
      const token = this.generateToken(username, isFirstLogin);

      return { 
        success: true, 
        isFirstLogin, 
        token 
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, isFirstLogin: false };
    }
  }

  /**
   * Authenticate user with remember me option
   */
  static async authenticateWithRememberMe(username: string, password: string, rememberMe: boolean): Promise<{ success: boolean; isFirstLogin: boolean; token?: string }> {
    try {
      const isValid = await UserService.verifyCredentials(username, password);
      
      if (!isValid) {
        return { success: false, isFirstLogin: false };
      }

      const isFirstLogin = await UserService.isFirstLogin();
      const token = this.generateToken(username, isFirstLogin, rememberMe);

      return { 
        success: true, 
        isFirstLogin, 
        token 
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, isFirstLogin: false };
    }
  }

  /**
   * Change user password
   */
  static async changePassword(currentUsername: string, currentPassword: string, newUsername: string, newPassword: string): Promise<{ success: boolean; token?: string }> {
    try {
      // Verify current credentials
      const isValid = await UserService.verifyCredentials(currentUsername, currentPassword);
      
      if (!isValid) {
        return { success: false };
      }

      // Update user credentials
      await UserService.updateUser(newUsername, newPassword);
      
      // Mark first login as complete
      await UserService.markFirstLoginComplete();

      // Generate new token
      const token = this.generateToken(newUsername, false);

      return { 
        success: true, 
        token 
      };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false };
    }
  }

  /**
   * Get user info from token
   */
  static async getUserFromToken(token: string): Promise<{ username: string; isFirstLogin: boolean } | null> {
    try {
      const payload = this.verifyToken(token);
      
      if (!payload) {
        return null;
      }

      return {
        username: payload.username,
        isFirstLogin: payload.isFirstLogin
      };
    } catch (error) {
      console.error('Error getting user from token:', error);
      return null;
    }
  }
}

