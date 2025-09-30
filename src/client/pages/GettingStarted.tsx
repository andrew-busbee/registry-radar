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
          <p className="text-muted-foreground mt-1">
            Learn how to use Registry Radar to monitor your container images
          </p>
        </div>
      </div>

      <GettingStartedGuide
        onAddContainer={onAddContainer}
        onBulkImport={onBulkImport}
      />
    </div>
  );
}
