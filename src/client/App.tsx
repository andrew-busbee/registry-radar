import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ContainerRegistry, ContainerState, Notification, CronConfig, NotificationConfig } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Containers } from './pages/Containers';
import { Settings } from './pages/Settings';
import { Notifications as NotificationsPage } from './pages/Notifications';
import { Login } from './pages/Login';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CheckProvider } from './contexts/CheckContext';
import { CheckProgressBar } from './components/CheckProgressBar';
import { Footer } from './components/Footer';

// Main app content component (only shown when authenticated)
function AppContent() {
  const { user, logout } = useAuth();
  const [containers, setContainers] = useState<ContainerRegistry[]>([]);
  const [containerStates, setContainerStates] = useState<ContainerState[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cronConfig, setCronConfig] = useState<CronConfig>({ schedule: '0 9 * * *', enabled: true });
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    triggers: {
      onEveryRun: false,
      onNewUpdates: true,
      onErrors: true,
      onManualCheck: false,
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'notifications'>('general');

  // Check if user needs to change password on first login
  useEffect(() => {
    if (user?.isFirstLogin) {
      setShowPasswordChangeModal(true);
    }
  }, [user]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [containersRes, statesRes, notificationsRes, cronRes, notificationConfigRes] = await Promise.all([
          fetch('/api/config/containers', { credentials: 'include' }),
          fetch('/api/registry/states', { credentials: 'include' }),
          fetch('/api/notifications', { credentials: 'include' }),
          fetch('/api/cron/config', { credentials: 'include' }),
          fetch('/api/notification-config/config', { credentials: 'include' }),
        ]);

        const [containersData, statesData, notificationsData, cronData, notificationConfigData] = await Promise.all([
          containersRes.json(),
          statesRes.json(),
          notificationsRes.json(),
          cronRes.json(),
          notificationConfigRes.json(),
        ]);

        setContainers(containersData);
        setContainerStates(statesData);
        setNotifications(notificationsData);
        setCronConfig(cronData);
        setNotificationConfig(notificationConfigData);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up polling for real-time updates (only on dashboard)
    const interval = setInterval(() => {
      if (activePage === 'dashboard') {
        fetchData();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [activePage]);

  const handleAddContainer = async (container: ContainerRegistry) => {
    try {
      const response = await fetch('/api/config/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(container),
      });

      if (response.ok) {
        const newContainer = await response.json();
        setContainers(prev => [...prev, newContainer]);
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error adding container:', error);
      throw error;
    }
  };

  const handleUpdateContainer = async (index: number, container: ContainerRegistry) => {
    try {
      const response = await fetch(`/api/config/containers/${index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(container),
      });

      if (response.ok) {
        const updatedContainer = await response.json();
        setContainers(prev => prev.map((c, i) => i === index ? updatedContainer : c));
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error updating container:', error);
      throw error;
    }
  };

  const handleDeleteContainer = async (index: number) => {
    try {
      const response = await fetch(`/api/config/containers/${index}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setContainers(prev => prev.filter((_, i) => i !== index));
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error deleting container:', error);
      throw error;
    }
  };

  const handleCheckRegistry = async () => {
    try {
      const response = await fetch('/api/registry/check', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // Refresh data after check
        const [statesRes, notificationsRes] = await Promise.all([
          fetch('/api/registry/states', { credentials: 'include' }),
          fetch('/api/notifications', { credentials: 'include' }),
        ]);
        
        const [statesData, notificationsData] = await Promise.all([
          statesRes.json(),
          notificationsRes.json(),
        ]);

        setContainerStates(statesData);
        setNotifications(notificationsData);
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error checking registry:', error);
      throw error;
    }
  };

  const handleUpdateCronConfig = async (config: Partial<CronConfig>) => {
    try {
      const updates = [];

      if (config.schedule !== undefined) {
        updates.push(
          fetch('/api/cron/config/schedule', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ schedule: config.schedule }),
          }).then(response => {
            if (!response.ok) {
              throw new Error(`Failed to update schedule: ${response.statusText}`);
            }
            return response.json();
          })
        );
      }

      if (config.enabled !== undefined) {
        updates.push(
          fetch('/api/cron/config/enabled', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ enabled: config.enabled }),
          }).then(response => {
            if (!response.ok) {
              throw new Error(`Failed to update enabled status: ${response.statusText}`);
            }
            return response.json();
          })
        );
      }

      await Promise.all(updates);
      
      // Update the local state after successful API calls
      setCronConfig(prev => ({ ...prev, ...config }));
      
      return true;
    } catch (error) {
      console.error('Error updating cron config:', error);
      throw error;
    }
  };

  const handleUpdateNotificationConfig = async (config: Partial<NotificationConfig>) => {
    try {
      const response = await fetch('/api/notification-config/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update notification configuration');
      }

      // Update the local state after successful API call
      setNotificationConfig(prev => ({ ...prev, ...config }));
      
      return true;
    } catch (error) {
      console.error('Error updating notification config:', error);
      throw error;
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleClearNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleNavigateToSettings = (tab: 'general' | 'notifications' = 'general') => {
    setSettingsInitialTab(tab);
    setActivePage('settings');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'containers':
        return (
          <Containers
            containers={containers}
            containerStates={containerStates}
            onAddContainer={handleAddContainer}
            onUpdateContainer={handleUpdateContainer}
            onDeleteContainer={handleDeleteContainer}
            onCheckRegistry={handleCheckRegistry}
          />
        );
      case 'settings':
        return (
          <Settings
            cronConfig={cronConfig}
            onUpdateCronConfig={handleUpdateCronConfig}
            notificationConfig={notificationConfig}
            onUpdateNotificationConfig={handleUpdateNotificationConfig}
            initialTab={settingsInitialTab}
          />
        );
      case 'notifications':
        return (
          <NotificationsPage
            notifications={notifications}
            onMarkAsRead={handleMarkNotificationAsRead}
            onClearAll={handleClearNotifications}
            onNavigateToSettings={() => handleNavigateToSettings('notifications')}
          />
        );
      default:
        return (
          <Dashboard
            containers={containers}
            containerStates={containerStates}
            notifications={notifications}
            onCheckRegistry={handleCheckRegistry}
            onAddContainer={handleAddContainer}
            onUpdateContainer={handleUpdateContainer}
            onDeleteContainer={handleDeleteContainer}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <ThemeProvider>
      <CheckProvider>
        <Router>
          <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <div className="flex flex-1 pb-20">
              <Sidebar 
                activePage={activePage}
                onPageChange={setActivePage}
                unreadCount={unreadNotifications.length}
              />
              <main className="flex-1 p-6">
                {renderPage()}
              </main>
            </div>
            <CheckProgressBar />
            <Footer />
            <PasswordChangeModal 
              isOpen={showPasswordChangeModal}
              onClose={() => setShowPasswordChangeModal(false)}
              isFirstLogin={user?.isFirstLogin || false}
            />
          </div>
        </Router>
      </CheckProvider>
    </ThemeProvider>
  );
}

// Main App component with authentication
function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AppContent />;
}

export default App;
