import { GettingStartedGuide } from '../components/GettingStartedGuide';

interface GettingStartedProps {
  onAddContainer: () => void;
  onBulkImport: () => void;
}

export function GettingStarted({ onAddContainer, onBulkImport }: GettingStartedProps) {
  return (
    <div className="space-y-6">
      <GettingStartedGuide
        onAddContainer={onAddContainer}
        onBulkImport={onBulkImport}
      />
    </div>
  );
}
