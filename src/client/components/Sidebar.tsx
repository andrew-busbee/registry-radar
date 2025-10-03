import { Bell, Settings, Container, Home, BookOpen } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  unreadCount: number;
}

export function Sidebar({ activePage, onPageChange, unreadCount }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'containers', label: 'Image Details', icon: Container },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:block w-64 bg-card border-r border-border fixed left-0 top-0 h-full overflow-y-auto p-4">
      {/* Brand Section */}
      <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Container className="w-5 h-5 text-primary-foreground animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Registry Radar</h1>
      </div>
      
      <nav className="space-y-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <div key={id}>
            <button
              onClick={() => onPageChange(id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePage === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </div>
              {id === 'notifications' && unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {id === 'notifications' && <div className="h-4"></div>}
          </div>
        ))}
      </nav>
    </aside>
  );
}
