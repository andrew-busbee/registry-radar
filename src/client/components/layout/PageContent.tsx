import { ReactNode } from 'react';
import { LAYOUT } from '../../constants/layout';

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export function PageContent({ children, className = '' }: PageContentProps) {
  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {children}
    </div>
  );
}
