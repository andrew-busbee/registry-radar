import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ContainerRegistry, ContainerState, Notification, CronConfig, NotificationConfig } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Containers } from './pages/Containers';
import { GettingStarted } from './pages/GettingStarted';
import { Settings } from './pages/Settings';
import { Notifications as NotificationsPage } from './pages/Notifications';
import { ThemeProvider } from './contexts/ThemeContext';
import { CheckProvider } from './contexts/CheckContext';
import { CheckProgressBar } from './components/CheckProgressBar';
import { Footer } from './components/Footer';

// Main app content component
function AppContent() {
  const [containers, setContainers] = useState<ContainerRegistry[]>([]);
  const [containerStates, setContainerStates] = useState<ContainerState[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cronConfig, setCronConfig] = useState<CronConfig>({ schedule: '0 9 * * *', enabled: true, timezone: 'America/Chicago' });
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    triggers: {
      sendSummaryOnScheduledRun: true,
      sendIndividualReportsOnScheduledRun: false,
      sendReportsWhenUpdatesFound: true,
      sendReportsOnErrors: true,
      sendReportsOnManualCheck: false,
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'notifications'>('general');


  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [containersRes, statesRes, notificationsRes, cronRes, notificationConfigRes] = await Promise.all([
          fetch('/api/config/containers'),
          fetch('/api/registry/states'),
          fetch('/api/notifications'),
          fetch('/api/cron/config'),
          fetch('/api/notification-config/config'),
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
  }, []); // Remove activePage dependency to always fetch data on mount

  const handleAddContainer = async (container: ContainerRegistry) => {
    try {
      const response = await fetch('/api/config/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const refreshContainerStates = async () => {
    try {
      const statesRes = await fetch('/api/registry/states');
      if (statesRes.ok) {
        const statesData = await statesRes.json();
        setContainerStates(statesData);
        return true;
      } else {
        throw new Error('Failed to fetch container states');
      }
    } catch (error) {
      console.error('Error refreshing container states:', error);
      throw error;
    }
  };

  const handleCheckRegistry = async () => {
    try {
      const response = await fetch('/api/registry/check', {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh data after check
        const [statesRes, notificationsRes] = await Promise.all([
          fetch('/api/registry/states'),
          fetch('/api/notifications'),
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
      // IMPORTANT: If both schedule and enabled are provided, update the schedule FIRST,
      // then toggle enabled. Doing these in parallel can cause the enabled call to
      // persist the previous schedule, overwriting the new one.

      if (config.schedule !== undefined && config.enabled !== undefined) {
        const scheduleResp = await fetch('/api/cron/config/schedule', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule: config.schedule }),
        });
        if (!scheduleResp.ok) {
          throw new Error(`Failed to update schedule: ${scheduleResp.statusText}`);
        }
        await scheduleResp.json();

        const enabledResp = await fetch('/api/cron/config/enabled', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: config.enabled }),
        });
        if (!enabledResp.ok) {
          throw new Error(`Failed to update enabled state: ${enabledResp.statusText}`);
        }
        await enabledResp.json();
      } else if (config.schedule !== undefined) {
        const scheduleResp = await fetch('/api/cron/config/schedule', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule: config.schedule }),
        });
        if (!scheduleResp.ok) {
          throw new Error(`Failed to update schedule: ${scheduleResp.statusText}`);
        }
        await scheduleResp.json();
      } else if (config.enabled !== undefined) {
        const enabledResp = await fetch('/api/cron/config/enabled', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: config.enabled }),
        });
        if (!enabledResp.ok) {
          throw new Error(`Failed to update enabled state: ${enabledResp.statusText}`);
        }
        await enabledResp.json();
      }
      
      // Refresh cron configuration from server to ensure we have the latest data
      try {
        const cronResponse = await fetch('/api/cron/config');
        if (cronResponse.ok) {
          const updatedCronData = await cronResponse.json();
          setCronConfig(updatedCronData);
        }
      } catch (error) {
        console.error('Error refreshing cron config:', error);
        // Fallback to local update if server refresh fails
        setCronConfig(prev => ({ ...prev, ...config }));
      }
      
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
      });

      if (response.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      });

      if (response.ok) {
        // Update local state to mark all notifications as read
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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
            onRefreshContainerStates={refreshContainerStates}
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
            onMarkAllAsRead={handleMarkAllAsRead}
            onNavigateToSettings={() => handleNavigateToSettings('notifications')}
          />
        );
      case 'getting-started':
        return (
          <GettingStarted
            onAddContainer={handleAddContainer}
            onBulkImport={async (containers: ContainerRegistry[]) => {
              const response = await fetch('/api/config/containers/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ containers }),
              });
              if (response.ok) {
                window.location.reload();
              }
            }}
          />
        );
      default:
        return (
          <Dashboard
            containers={containers}
            containerStates={containerStates}
            notifications={notifications}
            onCheckRegistry={handleCheckRegistry}
            onRefreshContainerStates={refreshContainerStates}
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
          </div>
        </Router>
      </CheckProvider>
    </ThemeProvider>
  );
}

// Main App component
function App() {
  return <AppContent />;
}

export default App;
