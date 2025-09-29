import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  username: string;
  isFirstLogin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; isFirstLogin: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentUsername: string, currentPassword: string, newUsername: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check authentication status on mount
  const checkAuth = async (): Promise<void> => {
    try {
      console.log('🔍 Checking authentication status...');
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });

      console.log('🔍 Auth check response:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Auth data received:', data);
        setUser({
          username: data.username,
          isFirstLogin: data.isFirstLogin
        });
      } else {
        console.log('🔍 Auth check failed, user not authenticated');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (username: string, password: string, rememberMe: boolean): Promise<{ success: boolean; isFirstLogin: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser({
          username: data.username,
          isFirstLogin: data.isFirstLogin
        });
        return { success: true, isFirstLogin: data.isFirstLogin };
      } else {
        return { success: false, isFirstLogin: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, isFirstLogin: false, error: 'Network error' };
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  // Change password function
  const changePassword = async (currentUsername: string, currentPassword: string, newUsername: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentUsername,
          currentPassword,
          newUsername,
          newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update user info after successful password change
        setUser({
          username: data.username,
          isFirstLogin: false
        });
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Password change failed' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    changePassword,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
