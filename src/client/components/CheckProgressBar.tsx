import { useCheck } from '../contexts/CheckContext';
import { RefreshCw, X } from 'lucide-react';

export function CheckProgressBar() {
  const { progress, cancelCheck } = useCheck();

  if (!progress.isChecking) {
    return null;
  }

  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const elapsed = progress.startTime ? Date.now() - progress.startTime : 0;
  const elapsedSeconds = Math.floor(elapsed / 1000);
  const estimatedTotal = progress.current > 0 ? (elapsed / progress.current) * progress.total : 0;
  const remaining = Math.max(0, estimatedTotal - elapsed);
  const remainingSeconds = Math.floor(remaining / 1000);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${minutes}m ${remainingSecs}s`;
  };

  return (
    <div className="fixed bottom-16 left-64 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-xs opacity-75">
              {elapsedSeconds > 0 && (
                <div>
                  <div>Elapsed: {formatTime(elapsedSeconds)}</div>
                  {remainingSeconds > 0 && (
                    <div>Remaining: ~{formatTime(remainingSeconds)}</div>
                  )}
                </div>
              )}
            </div>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  Checking {progress.current} of {progress.total} images
                </span>
                {progress.currentContainer && (
                  <span className="text-xs opacity-75 truncate max-w-xs">
                    • {progress.currentContainer}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex-1 bg-primary-foreground/20 rounded-full h-1.5 min-w-0">
                  <div 
                    className="bg-primary-foreground h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs opacity-75">
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={cancelCheck}
              className="p-1 hover:bg-primary-foreground/20 rounded transition-colors"
              title="Cancel check"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
