import { useState } from 'react';
import { RefreshCw, Trash2, Edit, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { ContainerRegistry, ContainerState } from '../types';

interface ContainerCardProps {
  container: ContainerRegistry;
  containerState?: ContainerState;
  onUpdate: (container: ContainerRegistry) => Promise<void>;
  onDelete: () => void;
  onCheck: () => void;
  onDismissUpdate?: () => Promise<void>;
  isChecking?: boolean;
}

export function ContainerCard({ 
  container, 
  containerState, 
  onUpdate, 
  onDelete, 
  onCheck,
  onDismissUpdate,
  isChecking = false 
}: ContainerCardProps) {
  
  // Helper function to check if a tag is a v-prefixed versioned tag (like v1.2.3) or has additional characters after semantic version (like 0.1.0-beta.4)
  const isVPrefixedVersionedTag = (tag: string): boolean => {
    // Match v-prefixed versions like v1.2.3
    const vPrefixedPattern = /^v\d+\.\d+\.\d+/;
    // Match versions with additional characters after semantic version like 0.1.0-beta.4, 1.2.3-rc.1, etc.
    const extendedVersionPattern = /^\d+\.\d+\.\d+[^0-9]/;
    return vPrefixedPattern.test(tag) || extendedVersionPattern.test(tag);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ContainerRegistry>({
    ...container,
    tag: container.tag || 'latest'
  });

  const handleSave = async () => {
    try {
      await onUpdate(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving container:', error);
      // Keep the edit form open so user can try again
    }
  };

  const handleCancel = () => {
    setEditData({
      ...container,
      tag: container.tag || 'latest'
    });
    setIsEditing(false);
  };

  const getStatusIcon = () => {
    if (!containerState) {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    
    // Check if container has never been checked (empty lastChecked)
    if (!containerState.lastChecked || containerState.lastChecked === '') {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    
    // Error or unsupported status - show red X
    if (containerState.error || containerState.statusMessage) {
      return <X className="w-4 h-4 text-red-500" />;
    }
    
    if (containerState.hasUpdate || containerState.hasNewerTag) {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
    
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getDaysSinceUpdate = () => {
    if (!containerState?.lastUpdated) {
      return null;
    }
    
    const lastUpdated = new Date(containerState.lastUpdated);
    const now = new Date();
    const diffTime = now.getTime() - lastUpdated.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    return diffDays;
  };

  const getStatusText = () => {
    if (!containerState) {
      return 'Never Checked. Will compare with registry on next scheduled or manual check';
    }
    
    // Check if container has never been checked (empty lastChecked)
    if (!containerState.lastChecked || containerState.lastChecked === '') {
      return 'Never Checked. Will compare with registry on next scheduled or manual check';
    }
    
    // Error or unsupported status
    if (containerState.error || containerState.statusMessage) {
      return 'check image and tag and try again';
    }
    
    // Note: Do not use an interim "new image" status after first check; show normal statuses instead
    
    if ((containerState.hasUpdate || containerState.hasNewerTag) && !containerState.updateAcknowledged) {
      return 'Update Available';
    }
    
    return 'Up to date';
  };

  // Helper function to check if dismiss button should be shown
  const shouldShowDismissButton = () => {
    if (!containerState || (!containerState.hasUpdate && !containerState.hasNewerTag)) {
      return false;
    }
    
    // Show button if:
    // - There is a SHA update and it hasn't been acknowledged, OR
    // - There is a newer semantic tag available (ack state doesn't apply to this case)
    return (containerState.hasUpdate && !containerState.updateAcknowledged) || !!containerState.hasNewerTag;
  };


  const getStatusColor = () => {
    if (!containerState) {
      return 'text-gray-500';
    }
    
    // Check if container has never been checked (empty lastChecked)
    if (!containerState.lastChecked || containerState.lastChecked === '') {
      return 'text-gray-500';
    }
    
    // Error or unsupported status - show red
    if (containerState.error || containerState.statusMessage) {
      return 'text-red-600';
    }
    
    if ((containerState.hasUpdate || containerState.hasNewerTag) && !containerState.updateAcknowledged) {
      return 'text-orange-600';
    }
    
    const days = getDaysSinceUpdate();
    if (days !== null) {
      if (days <= 180) {
        return 'text-green-600';
      } else if (days <= 365) {
        return 'text-yellow-600';
      } else {
        return 'text-red-600';
      }
    }
    
    return 'text-green-600';
  };

  return (
    <div className="group bg-card border-2 border-border rounded-2xl p-4 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 shadow-lg">
      {/* Header with status indicator */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            containerState?.error
              ? 'bg-red-100 dark:bg-red-900/20'
              : (!containerState || !containerState.lastChecked || containerState.lastChecked === '')
                ? 'bg-gray-100 dark:bg-gray-800/40'
                : (containerState.hasUpdate || containerState.hasNewerTag)
                  ? 'bg-orange-100 dark:bg-orange-900/20'
                  : 'bg-green-100 dark:bg-green-900/20'
          }`}>
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">{container.name}</h3>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {shouldShowDismissButton() && (
            <button
              onClick={onDismissUpdate}
              className="px-3 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30 rounded-md transition-all duration-200 font-medium"
              title="Reset update notification"
            >
              Reset Update Notification
            </button>
          )}
          
          <button
            onClick={onCheck}
            disabled={isChecking}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 disabled:opacity-50"
            title="Check for updates"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200"
            title="Edit container"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
            title="Delete container"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name
            </label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Image Path
            </label>
            <input
              type="text"
              value={editData.imagePath}
              onChange={(e) => {
                const value = e.target.value;
                const lastSlash = value.lastIndexOf('/');
                const lastColon = value.lastIndexOf(':');
                const hasDigest = value.includes('@sha256:');
                
                if (!hasDigest && lastColon > lastSlash && (editData.tag || '').trim() === '') {
                  const pathOnly = value.substring(0, lastColon);
                  const tagPart = value.substring(lastColon + 1);
                  // Auto-fill name from image path (same logic as bulk import)
                  const autoName = pathOnly.split('/').pop() || pathOnly;
                  setEditData({ 
                    ...editData, 
                    imagePath: pathOnly, 
                    tag: tagPart,
                    name: (editData.name || '').trim() === '' ? autoName : editData.name
                  });
                } else {
                  // Auto-fill name from image path even without tag
                  const autoName = value.split('/').pop() || value;
                  setEditData({ 
                    ...editData, 
                    imagePath: value,
                    name: (editData.name || '').trim() === '' ? autoName : editData.name
                  });
                }
              }}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              placeholder="e.g., andrewbusbee/planning-poker, nginx, ghcr.io/user/repo"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Registry will be auto-detected from the image path
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tag (optional)
            </label>
            <input
              type="text"
              value={editData.tag || ''}
              onChange={(e) => setEditData({ ...editData, tag: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              placeholder="defaults to 'latest' if empty"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Image info section */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border/60">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground">Monitored Image</h4>
              <div className="text-xs text-primary-foreground bg-primary px-2 py-1 rounded-full font-medium">
                Tag: {container.tag || 'latest'}
              </div>
            </div>
            <div className="font-mono text-sm text-foreground break-all">
              {container.imagePath}:{container.tag || 'latest'}
            </div>
            {isVPrefixedVersionedTag(container.tag || 'latest') && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex items-start gap-2">
                  <div className="text-blue-600 dark:text-blue-400 text-sm">💡</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Warning:</strong> Consider monitoring the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">latest</code> tag instead of version-specific tags like <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{container.tag || 'latest'}</code> to ensure automatic update notifications when new versions are released. Tags like 3.2.1 will work just fine, and version specific tags like <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{container.tag || 'latest'}</code> will be addressed in future releases.
                  </div>
                </div>
              </div>
            )}
            {containerState && containerState.currentSha && (
              <div className="text-xs text-muted-foreground mt-2">
                Current SHA: {containerState.currentSha.substring(0, 12)}...
              </div>
            )}
          </div>

          {/* Status details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {containerState && containerState.lastChecked && (
              <div className="bg-muted/50 rounded-lg p-2 border border-border/60">
                <div className="text-xs font-medium text-muted-foreground mb-1">Image Last Checked</div>
                <div className="text-sm text-foreground">
                  {new Date(containerState.lastChecked).toLocaleString()}
                </div>
              </div>
            )}
            
            {containerState && containerState.lastUpdated && (
              <div className="bg-muted/50 rounded-lg p-2 border border-border/60">
                <div className="text-xs font-medium text-muted-foreground mb-1">Image Last Updated</div>
                <div className="text-sm text-foreground">
                  {new Date(containerState.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* Latest version info (if available) */}
          {containerState && containerState.latestAvailableTag && containerState.latestAvailableTag !== containerState.tag && (
            <div className="bg-muted/50 border border-border/60 rounded-lg p-2">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Latest Version Available</div>
              <div className="text-sm text-blue-900 dark:text-blue-100">
                {containerState.latestAvailableTag}
                {containerState.latestAvailableUpdated && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                    ({new Date(containerState.latestAvailableUpdated).toLocaleDateString()})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
