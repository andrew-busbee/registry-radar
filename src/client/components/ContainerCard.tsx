import { useState } from 'react';
import { RefreshCw, Trash2, Edit, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { ContainerRegistry, ContainerState } from '../types';

interface ContainerCardProps {
  container: ContainerRegistry;
  containerState?: ContainerState;
  onUpdate: (container: ContainerRegistry) => Promise<void>;
  onDelete: () => void;
  onCheck: () => void;
  isChecking?: boolean;
}

export function ContainerCard({ 
  container, 
  containerState, 
  onUpdate, 
  onDelete, 
  onCheck,
  isChecking = false 
}: ContainerCardProps) {
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
    
    if (containerState.isNew) {
      return <AlertCircle className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
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
      return 'Never checked';
    }
    
    // Check if container has never been checked (empty lastChecked)
    if (!containerState.lastChecked || containerState.lastChecked === '') {
      return 'Never checked';
    }
    
    // Error or unsupported status
    if (containerState.error || containerState.statusMessage) {
      return 'check image and tag and try again';
    }
    
    if (containerState.isNew) {
      return 'New image to monitor';
    }
    
    if (containerState.hasUpdate || containerState.hasNewerTag) {
      return 'Update Available';
    }
    
    return 'Up to date';
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
    
    if (containerState.isNew) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    
    if (containerState.hasUpdate || containerState.hasNewerTag) {
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
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h3 className="font-semibold text-foreground">{container.name}</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onCheck}
            disabled={isChecking}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Check for updates"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit container"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
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
                  setEditData({ ...editData, imagePath: pathOnly, tag: tagPart });
                } else {
                  setEditData({ ...editData, imagePath: value });
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
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Monitoring Image:</span> {container.imagePath}:{container.tag || 'latest'}
          </div>
          
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            Status: {getStatusText()}
          </div>
          
          {containerState && containerState.currentSha && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Current SHA:</span> {containerState.currentSha.substring(0, 12)}...
            </div>
          )}
          
          {containerState && containerState.tag && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Monitored Version:</span> {containerState.tag}
              {containerState.lastUpdated && (
                <span className="ml-1">({new Date(containerState.lastUpdated).toLocaleDateString()})</span>
              )}
            </div>
          )}
          
          {containerState && containerState.latestAvailableTag && containerState.latestAvailableTag !== containerState.tag && (
            <div className="text-xs text-blue-600">
              <span className="font-medium">Latest Version:</span> {containerState.latestAvailableTag}
              {containerState.latestAvailableUpdated && (
                <span className="ml-1">({new Date(containerState.latestAvailableUpdated).toLocaleDateString()})</span>
              )}
            </div>
          )}
          
          {containerState && containerState.platform && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Platform:</span> {containerState.platform}
            </div>
          )}
          
          {containerState && containerState.lastChecked && (
            <div className="text-xs text-muted-foreground">
              Last checked: {new Date(containerState.lastChecked).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
