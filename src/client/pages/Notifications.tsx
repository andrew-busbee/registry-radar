import { useState, useMemo } from 'react';
import { Trash2, CheckCircle, AlertCircle, Clock, Check, Settings, Bell } from 'lucide-react';
import { Notification } from '../types';
import { ThemeToggle } from '../components/ThemeToggle';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';

interface NotificationsProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onNavigateToSettings?: () => void;
}

type FilterType = 'all' | 'update' | 'error' | 'unread';

export function Notifications({ notifications, onMarkAsRead, onClearAll, onMarkAllAsRead, onNavigateToSettings }: NotificationsProps) {
  const [isClearing, setIsClearing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
      setIsClearing(true);
      try {
        await onClearAll();
      } catch (error) {
        console.error('Error clearing notifications:', error);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      // Note: In a real app, you'd update the parent state here
      console.log('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'update':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (type: Notification['type'], read: boolean) => {
    if (read) {
      return 'bg-muted border-border';
    }
    
    switch (type) {
      case 'update':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getNotificationText = (type: Notification['type'], read: boolean) => {
    if (read) {
      return 'text-muted-foreground';
    }
    
    switch (type) {
      case 'update':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
      default:
        return 'text-blue-900';
    }
  };

  // Filter notifications based on active filter
  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'update':
        return notifications.filter(n => n.type === 'update');
      case 'error':
        return notifications.filter(n => n.type === 'error');
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const headerActions = (
    <>
      {unreadCount > 0 && (
        <button
          onClick={handleMarkAllAsRead}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>Mark All Read</span>
        </button>
      )}
      {notifications.length > 0 && (
        <button
          onClick={handleClearAll}
          disabled={isClearing}
          className="flex items-center space-x-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          <span>{isClearing ? 'Clearing...' : 'Clear All'}</span>
        </button>
      )}
      <ThemeToggle />
    </>
  );

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread notifications` : 'All notifications read'}
        actions={headerActions}
      />

      <PageContent>
        {/* Filter Options */}
        {notifications.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3">Filter by Type</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeFilter === 'all' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                All ({notifications.length})
              </button>
              <button 
                onClick={() => setActiveFilter('update')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeFilter === 'update' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Updates ({notifications.filter(n => n.type === 'update').length})
              </button>
              <button 
                onClick={() => setActiveFilter('error')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeFilter === 'error' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Errors ({notifications.filter(n => n.type === 'error').length})
              </button>
              <button 
                onClick={() => setActiveFilter('unread')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeFilter === 'unread' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>
        )}

        {filteredNotifications.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {notifications.length === 0 ? 'No notifications' : `No ${activeFilter} notifications`}
              </h3>
              <p className="text-muted-foreground mb-6">
                {notifications.length === 0 
                  ? "You'll see notifications here when images have updates or when errors occur."
                  : `Try selecting a different filter to see more notifications.`
                }
              </p>
              {onNavigateToSettings && notifications.length === 0 && (
                <button
                  onClick={onNavigateToSettings}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  <span>Configure Notifications</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer hover:shadow-sm ${
                  getNotificationBg(notification.type, notification.read)
                }`}
                onClick={() => !notification.read && onMarkAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${
                      getNotificationText(notification.type, notification.read)
                    }`}>
                      {notification.message}
                    </p>
                    {notification.container && (
                      <p className={`text-sm mt-1 ${
                        notification.read ? 'text-muted-foreground' : 'text-muted-foreground'
                      }`}>
                        Container: {notification.container}
                      </p>
                    )}
                    <p className={`text-xs mt-2 ${
                      notification.read ? 'text-muted-foreground' : 'text-muted-foreground'
                    }`}>
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContent>
    </div>
  );
}
