import { ReactNode } from 'react';

interface ResponsiveContainerGridProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveContainerGrid({ children, className = '' }: ResponsiveContainerGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {children}
    </div>
  );
}
