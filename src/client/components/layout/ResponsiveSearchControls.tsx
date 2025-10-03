import { ReactNode } from 'react';
import { Search, X } from 'lucide-react';

interface ResponsiveSearchControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  children?: ReactNode;
  className?: string;
}

export function ResponsiveSearchControls({ 
  searchQuery, 
  onSearchChange, 
  children, 
  className = '' 
}: ResponsiveSearchControlsProps) {
  return (
    <div className={`bg-muted/30 border border-border rounded-lg p-4 md:p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-foreground mb-4">Search</h2>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, image, or tag..."
            className="w-full pl-10 pr-10 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Additional Controls */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
