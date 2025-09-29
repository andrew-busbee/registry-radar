import { AlertTriangle, Clock, X } from 'lucide-react';

interface CheckConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  imageCount: number;
  isChecking?: boolean;
}

export function CheckConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  imageCount, 
  isChecking = false 
}: CheckConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Checking {imageCount} Images
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isChecking}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground">
                  Checking {imageCount} images may take some time. Please be patient while we:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>• Fetch available tags from registries</li>
                  <li>• Compare versions and check for updates</li>
                  <li>• Update container states</li>
                </ul>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> You can cancel this operation at any time, but it's recommended to let it complete for accurate results.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isChecking}
                className="flex-1 py-2 px-4 border border-border rounded-lg text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isChecking}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Checking...
                  </div>
                ) : (
                  'Start Checking'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
