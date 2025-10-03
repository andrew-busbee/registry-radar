import { ReactNode, cloneElement, isValidElement } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  // Helper function to filter out ThemeToggle on mobile
  const filterActionsForMobile = (actions: ReactNode) => {
    if (!actions) return null;
    
    if (isValidElement(actions)) {
      // Single element
      if (actions.type && (actions.type as any).name === 'ThemeToggle') {
        return null; // Hide ThemeToggle on mobile
      }
      return actions;
    }
    
    if (Array.isArray(actions)) {
      // Array of elements - filter out ThemeToggle
      return actions.filter((action) => {
        if (isValidElement(action) && action.type && (action.type as any).name === 'ThemeToggle') {
          return false; // Hide ThemeToggle on mobile
        }
        return true;
      });
    }
    
    return actions;
  };

  const mobileActions = filterActionsForMobile(actions);

  return (
    <div 
      className={`bg-background border-b border-border pb-4 px-6 pt-4 ${className}`}
    >
      {/* Mobile Layout */}
      <div className="md:hidden">
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm mb-4">{description}</p>
        )}
        {mobileActions && (
          <div className="flex flex-wrap gap-2">
            {mobileActions}
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
