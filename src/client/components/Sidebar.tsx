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
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:block w-64 bg-card border-r border-border p-4">
      <nav className="space-y-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
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
        ))}
      </nav>
    </aside>
  );
}
