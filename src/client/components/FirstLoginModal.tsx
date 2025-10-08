import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FirstLoginModalProps {
  currentUsername: string;
  currentPassword: string;
  onComplete: () => void;
}

export function FirstLoginModal({ currentUsername, currentPassword, onComplete }: FirstLoginModalProps) {
  const { changePassword } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (!newUsername.trim()) {
      setError('Username is required');
      setIsLoading(false);
      return;
    }

    if (!newPassword.trim()) {
      setError('Password is required');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Prevent using default credentials
    if (newUsername.toLowerCase() === 'user') {
      setError('Username "user" is not allowed. Please choose a different username.');
      setIsLoading(false);
      return;
    }

    if (newPassword === 'password') {
      setError('Password "password" is not allowed. Please choose a different password.');
      setIsLoading(false);
      return;
    }

    const result = await changePassword(
      currentUsername,
      currentPassword,
      newUsername,
      newPassword,
      confirmPassword
    );

    if (result.success) {
      onComplete();
    } else {
      setError(result.error || 'Failed to change password');
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Change Default Username & Password</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              For security reasons, you must change the default username and password before accessing Registry Radar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="newUsername" className="block text-sm font-medium mb-2">
                New Username
              </label>
              <input
                id="newUsername"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
