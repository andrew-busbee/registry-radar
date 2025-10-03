import { ReactNode } from 'react';
import { LAYOUT } from '../../constants/layout';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div 
      className={`hidden md:block fixed top-0 ${LAYOUT.CONTENT_MARGIN} right-0 z-${LAYOUT.Z_INDEX.HEADER} bg-background border-b border-border pb-4 px-6 pt-4 ${className}`}
    >
      <div className="flex items-center justify-between">
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
