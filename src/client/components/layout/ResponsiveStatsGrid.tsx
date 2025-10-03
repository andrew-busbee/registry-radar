import { ReactNode } from 'react';

interface ResponsiveStatsGridProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveStatsGrid({ children, className = '' }: ResponsiveStatsGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
      {children}
    </div>
  );
}
