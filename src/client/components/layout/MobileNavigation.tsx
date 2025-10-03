import { useState } from 'react';
import { Menu, X, Bell, Settings, Container, Home, BookOpen } from 'lucide-react';
import { LAYOUT } from '../../constants/layout';

interface MobileNavigationProps {
  activePage: string;
  onPageChange: (page: string) => void;
  unreadCount: number;
}

export function MobileNavigation({ activePage, onPageChange, unreadCount }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'containers', label: 'Image Details', icon: Container },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 text-foreground hover:bg-accent rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Container className="w-5 h-5 text-primary-foreground animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Registry Radar</h1>
          </div>

          {unreadCount > 0 && (
            <div className="relative">
              <Bell className="w-6 h-6 text-foreground" />
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative w-80 max-w-[85vw] h-full bg-card border-r border-border shadow-xl">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Container className="w-5 h-5 text-primary-foreground animate-pulse" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Registry Radar</h1>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Navigation */}
            <nav className="p-4 space-y-2">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handlePageChange(id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activePage === id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </div>
                  {id === 'notifications' && unreadCount > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full min-w-[24px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
