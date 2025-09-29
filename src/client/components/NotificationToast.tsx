import { useState, useEffect } from 'react';
import { X, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Notification } from '../types';

interface NotificationToastProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export function NotificationToast({ notification, onMarkAsRead }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onMarkAsRead(notification.id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onMarkAsRead]);

  const getIcon = () => {
    switch (notification.type) {
      case 'update':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'update':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm w-full transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className={`p-4 rounded-lg border shadow-lg ${getBgColor()}`}>
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {notification.message}
            </p>
            {notification.container && (
              <p className="text-xs text-gray-600 mt-1">
                {notification.container}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onMarkAsRead(notification.id), 300);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
