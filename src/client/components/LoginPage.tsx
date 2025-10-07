import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FirstLoginModal } from './FirstLoginModal';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; password: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(username, password);
    console.log('Login result:', result);
    
    if (result.success) {
      if (result.firstLogin) {
        console.log('Showing first login modal');
        // Show first login modal
        setCurrentUser({ username, password });
        setShowFirstLoginModal(true);
      } else {
        console.log('Regular login successful, should redirect to main app');
      }
      // If not first login, the AuthContext will handle the redirect
    } else {
      console.log('Login failed:', result.error);
      setError(result.error || 'Login failed');
    }
    
    setIsLoading(false);
  };

  const handleFirstLoginComplete = () => {
    setShowFirstLoginModal(false);
    setCurrentUser(null);
    // The AuthContext will handle the redirect after successful password change
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Registry Radar
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Default credentials:</strong>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Username: <code>admin</code>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Password: <code>password</code>
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            ⚠️ You will be required to change these credentials on first login
          </div>
        </div>
      </div>

      {showFirstLoginModal && currentUser && (
        <FirstLoginModal
          currentUsername={currentUser.username}
          currentPassword={currentUser.password}
          onComplete={handleFirstLoginComplete}
        />
      )}
    </div>
  );
}
