import { GettingStartedGuide } from '../components/GettingStartedGuide';

interface GettingStartedProps {
  onAddContainer: () => void;
  onBulkImport: () => void;
}

export function GettingStarted({ onAddContainer, onBulkImport }: GettingStartedProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Getting Started</h1>
        </div>
      </div>

      <GettingStartedGuide
        onAddContainer={onAddContainer}
        onBulkImport={onBulkImport}
      />
    </div>
  );
}
