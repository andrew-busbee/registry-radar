import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-muted z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left side - App name and version */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Registry Radar</span>
            <span className="text-sm font-medium text-primary">v0.1.0-beta.1</span>
          </div>
          
          {/* Center - Copyright */}
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <span>Copyright</span>
            <span>{new Date().getFullYear() === 2025 ? '2025' : `2025-${new Date().getFullYear()}`}</span>
            <a
              href="https://www.youtube.com/channel/UCdIpxAnBnQa9ORpyMqwcYDw?sub_confirmation=1"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Andrew Busbee.
            </a>
            <span>All rights reserved.</span>
          </div>
          
          {/* Right side - GitHub link */}
          <div className="flex items-center space-x-2">
            <a
              href="https://github.com/andrew-busbee/registry-radar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Github className="w-4 h-4 text-primary-foreground" />
              </div>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
