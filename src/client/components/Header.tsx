import { Container } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Header() {

  return (
    <header className="bg-card border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Container className="w-5 h-5 text-primary-foreground animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Registry Radar</h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
