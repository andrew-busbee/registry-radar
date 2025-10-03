import { ReactNode, cloneElement, isValidElement } from 'react';
import { ThemeToggle } from '../ThemeToggle';

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
    
    console.log('Filtering actions:', actions, 'Type:', typeof actions, 'IsArray:', Array.isArray(actions)); // Debug log
    
    if (isValidElement(actions)) {
      // Single element - check if it's ThemeToggle by looking at the component name or displayName
      const componentName = actions.type?.name || actions.type?.displayName;
      console.log('Single action component name:', componentName, 'type:', actions.type); // Debug log
      
      // Try multiple ways to identify ThemeToggle
      if (componentName === 'ThemeToggle' || 
          actions.type === ThemeToggle || 
          actions.type?.toString?.().includes('ThemeToggle')) {
        console.log('Filtering out ThemeToggle on mobile'); // Debug log
        return null; // Hide ThemeToggle on mobile
      }
      return actions;
    }
    
    if (Array.isArray(actions)) {
      // Array of elements - filter out ThemeToggle
      console.log('Processing array with', actions.length, 'elements'); // Debug log
      const filtered = actions.filter((action) => {
        if (isValidElement(action)) {
          const componentName = action.type?.name || action.type?.displayName;
          console.log('Array action component name:', componentName, 'type:', action.type); // Debug log
          
          // Try multiple ways to identify ThemeToggle
          if (componentName === 'ThemeToggle' || 
              action.type === ThemeToggle || 
              action.type?.toString?.().includes('ThemeToggle')) {
            console.log('Filtering out ThemeToggle from array on mobile'); // Debug log
            return false; // Hide ThemeToggle on mobile
          }
        }
        return true;
      });
      console.log('Filtered array result:', filtered); // Debug log
      return filtered;
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
