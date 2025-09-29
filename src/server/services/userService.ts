import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  username: string;
  passwordHash: string;
  isFirstLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserService {
  private static readonly USER_FILE = path.join(process.cwd(), 'data', 'user.json');
  private static readonly DEFAULT_USERNAME = 'user';
  private static readonly DEFAULT_PASSWORD = 'password';

  /**
   * Initialize user configuration - create default user if none exists
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔍 Initializing user service...');
      console.log(`📁 User file path: ${this.USER_FILE}`);
      
      // Ensure data directory exists
      const dataDir = path.dirname(this.USER_FILE);
      if (!fs.existsSync(dataDir)) {
        console.log('📁 Creating data directory:', dataDir);
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Check if user file exists
      if (!fs.existsSync(this.USER_FILE)) {
        console.log('📁 User file does not exist, creating default user...');
        await this.createDefaultUser();
      } else {
        console.log('📁 User file already exists, skipping creation');
      }
    } catch (error) {
      console.error('Error initializing user service:', error);
      throw error;
    }
  }

  /**
   * Create default user with hashed password
   */
  private static async createDefaultUser(): Promise<void> {
    const passwordHash = await bcrypt.hash(this.DEFAULT_PASSWORD, 12);
    const user: User = {
      username: this.DEFAULT_USERNAME,
      passwordHash,
      isFirstLogin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(this.USER_FILE, JSON.stringify(user, null, 2));
    console.log('✅ Default user created (username: user, password: password)');
    console.log(`📁 User file created at: ${this.USER_FILE}`);
  }

  /**
   * Get current user
   */
  static async getUser(): Promise<User> {
    try {
      const userData = fs.readFileSync(this.USER_FILE, 'utf8');
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error reading user data:', error);
      throw new Error('Failed to read user data');
    }
  }

  /**
   * Update user credentials
   */
  static async updateUser(username: string, password: string): Promise<void> {
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const user: User = {
        username,
        passwordHash,
        isFirstLogin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(this.USER_FILE, JSON.stringify(user, null, 2));
    } catch (error) {
      console.error('Error updating user data:', error);
      throw new Error('Failed to update user data');
    }
  }

  /**
   * Verify user credentials
   */
  static async verifyCredentials(username: string, password: string): Promise<boolean> {
    try {
      const user = await this.getUser();
      return user.username === username && await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      console.error('Error verifying credentials:', error);
      return false;
    }
  }

  /**
   * Check if this is the first login
   */
  static async isFirstLogin(): Promise<boolean> {
    try {
      const user = await this.getUser();
      return user.isFirstLogin;
    } catch (error) {
      console.error('Error checking first login status:', error);
      return false;
    }
  }

  /**
   * Mark first login as completed
   */
  static async markFirstLoginComplete(): Promise<void> {
    try {
      const user = await this.getUser();
      user.isFirstLogin = false;
      user.updatedAt = new Date().toISOString();
      
      fs.writeFileSync(this.USER_FILE, JSON.stringify(user, null, 2));
    } catch (error) {
      console.error('Error marking first login complete:', error);
      throw new Error('Failed to update first login status');
    }
  }
}
