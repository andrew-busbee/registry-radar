import { ReactNode } from 'react';
import { Sidebar } from '../Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { CheckProgressBar } from '../CheckProgressBar';
import { Footer } from '../Footer';
import { LAYOUT } from '../../constants/layout';

interface AppLayoutProps {
  children: ReactNode;
  activePage: string;
  onPageChange: (page: string) => void;
  unreadCount: number;
}

export function AppLayout({ children, activePage, onPageChange, unreadCount }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar 
        activePage={activePage}
        onPageChange={onPageChange}
        unreadCount={unreadCount}
      />
      
      {/* Mobile Navigation */}
      <MobileNavigation
        activePage={activePage}
        onPageChange={onPageChange}
        unreadCount={unreadCount}
      />
      
      {/* Main Content */}
      <main className="md:ml-64 pb-20 pt-20 md:pt-4">
        {children}
      </main>
      
      <CheckProgressBar />
      <Footer />
    </div>
  );
}
