import { useState } from 'react';
import { RefreshCw, Container, AlertCircle, CheckCircle, Clock, Plus, X, Upload } from 'lucide-react';
import { ContainerRegistry, ContainerState, Notification } from '../types';
import { AddContainerModal } from '../components/AddContainerModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { ContainerCard } from '../components/ContainerCard';
import { CheckConfirmationModal } from '../components/CheckConfirmationModal';
import { useCheck } from '../contexts/CheckContext';

interface DashboardProps {
  containers: ContainerRegistry[];
  containerStates: ContainerState[];
  notifications: Notification[];
  onCheckRegistry: () => Promise<void>;
  onRefreshContainerStates: () => Promise<void>;
  onAddContainer: (container: ContainerRegistry) => Promise<void>;
  onUpdateContainer: (index: number, container: ContainerRegistry) => Promise<void>;
  onDeleteContainer: (index: number) => Promise<void>;
}

export function Dashboard({ 
  containers, 
  containerStates, 
  notifications, 
  onCheckRegistry,
  onRefreshContainerStates,
  onAddContainer,
  onUpdateContainer,
  onDeleteContainer
}: DashboardProps) {
  const { progress, startCheck, updateProgress, completeCheck, cancelCheck } = useCheck();
  
  const getDaysSinceUpdate = (state: ContainerState | undefined) => {
    if (!state?.lastUpdated) {
      return null;
    }
    
    const lastUpdated = new Date(state.lastUpdated);
    const now = new Date();
    const diffTime = now.getTime() - lastUpdated.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    return diffDays;
  };

  const getStatusText = (state: ContainerState | undefined) => {
    if (!state) {
      return 'Never checked';
    }
    
    // Check if container has never been checked (empty lastChecked)
    if (!state.lastChecked || state.lastChecked === '') {
      return 'Never checked';
    }
    
    if (state.hasUpdate) {
      return 'Update available';
    }
    
    const days = getDaysSinceUpdate(state);
    if (days !== null) {
      const lastUpdatedDate = new Date(state.lastUpdated!);
      const dateStr = lastUpdatedDate.toLocaleDateString();
      const dayStr = days === 1 ? 'day' : 'days';
      return `Image last updated ${days} ${dayStr} ago on ${dateStr}`;
    }
    
    return 'Up to date';
  };

  const getStatusColor = (state: ContainerState | undefined) => {
    if (!state) {
      return 'text-gray-500';
    }
    
    // Check if container has never been checked (empty lastChecked)
    if (!state.lastChecked || state.lastChecked === '') {
      return 'text-gray-500';
    }
    
    
    if (state.hasUpdate) {
      return 'text-orange-600';
    }
    
    const days = getDaysSinceUpdate(state);
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
  const [isChecking, setIsChecking] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [checkingIndex, setCheckingIndex] = useState<number | null>(null);
  const [isCheckConfirmationOpen, setIsCheckConfirmationOpen] = useState(false);

  const handleCheckRegistry = async () => {
    // Show confirmation if there are 10 or more images
    if (containers.length >= 10) {
      setIsCheckConfirmationOpen(true);
      return;
    }
    
    // Proceed directly if less than 10 images
    await performCheckRegistry();
  };

  const performCheckRegistry = async () => {
    if (progress.isChecking) {
      return; // Already checking
    }

    startCheck(containers.length);
    setIsChecking(true);
    
    try {
      // Simulate progress updates for each container
      for (let i = 0; i < containers.length; i++) {
        const container = containers[i];
        updateProgress(i + 1, `${container.imagePath}:${container.tag}`);
        
        // Check individual container
        try {
          const response = await fetch(`/api/registry/check/${i}`, {
            method: 'POST',
          });
          
          if (!response.ok) {
            console.error(`Failed to check container ${i}:`, response.statusText);
          }
        } catch (error) {
          console.error(`Error checking container ${i}:`, error);
        }
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Refresh container states after all checks
      const statesResponse = await fetch('/api/registry/states', { credentials: 'include' });
      const states = await statesResponse.json();
      // Note: In a real app, you'd update the parent state here
      
    } catch (error) {
      console.error('Error checking registry:', error);
    } finally {
      setIsChecking(false);
      completeCheck();
    }
  };

  // Only consider states that correspond to current containers
  const stateMatchesCurrent = containerStates.filter(state =>
    containers.some(c => c.imagePath === state.image && (c.tag || 'latest') === (state.tag || 'latest'))
  );

  const upToDate = stateMatchesCurrent.filter(state => (state.lastChecked && state.lastChecked !== '') && !state.hasUpdate && !state.hasNewerTag).length;
  const updatesAvailable = stateMatchesCurrent.filter(state => (state.lastChecked && state.lastChecked !== '') && (state.hasUpdate || state.hasNewerTag)).length;
  const total = containers.length;
  const neverCheckedRaw = total - upToDate - updatesAvailable;
  const neverChecked = Math.max(0, neverCheckedRaw);

  const stats = {
    total,
    upToDate,
    updatesAvailable,
    neverChecked,
  };

  const recentNotifications = notifications.slice(0, 5);
  const recentUpdates = containerStates.filter(state => state.hasUpdate);


  const handleBulkImport = async (containers: ContainerRegistry[]): Promise<{ success: boolean; errors: string[] }> => {
    try {
      const response = await fetch('/api/config/containers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containers }),
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh the containers list
        window.location.reload(); // Simple refresh for now
        return { success: true, errors: [] };
      } else {
        return { success: false, errors: result.errorDetails || [result.error || 'Import failed'] };
      }
    } catch (error) {
      return { success: false, errors: ['Network error: ' + (error as Error).message] };
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/config/containers/export', {
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'containers.txt';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleUpdateContainer = async (index: number, container: ContainerRegistry) => {
    try {
      await onUpdateContainer(index, container);
    } catch (error) {
      console.error('Error updating container:', error);
      // You could add a toast notification here
    }
  };

  const handleDeleteContainer = async (index: number) => {
    if (confirm('Are you sure you want to delete this container?')) {
      try {
        await onDeleteContainer(index);
      } catch (error) {
        console.error('Error deleting container:', error);
        // You could add a toast notification here
      }
    }
  };

  const handleCheckSingle = async (index: number) => {
    setCheckingIndex(index);
    try {
      const response = await fetch(`/api/registry/check/${index}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Refresh only the container states (not all containers)
        console.log('Container checked successfully, refreshing states...');
        await onRefreshContainerStates();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error checking single container:', error);
      // You could add a toast notification here
    } finally {
      setCheckingIndex(null);
    }
  };

  const getContainerState = (container: ContainerRegistry): ContainerState | undefined => {
    return containerStates.find(state => 
      state.image === container.imagePath && state.tag === container.tag
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your Docker container registries for updated images and get notified when new versions are available
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsBulkImportModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import List</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Image</span>
          </button>
          <button
            onClick={handleCheckRegistry}
            disabled={isChecking || containers.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check All'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Only show when there are containers */}
      {containers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Container className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Monitored Images</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stats.total}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Up to Date</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stats.upToDate}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">Updates Available</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stats.updatesAvailable}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-muted-foreground">Never Checked</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stats.neverChecked}</p>
          </div>
        </div>
      )}

      {/* Recent Updates - Only show if there are updates */}
      {recentUpdates.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Updates Available</h2>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
            {recentUpdates.map((state, index) => {
              const container = containers.find(c => 
                c.imagePath === state.image && c.tag === state.tag
              );
              
              const getDaysSinceUpdate = () => {
                if (!state.lastUpdated) {
                  return null;
                }
                
                const lastUpdated = new Date(state.lastUpdated);
                const now = new Date();
                const diffTime = now.getTime() - lastUpdated.getTime();
                const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                
                return diffDays;
              };

              const days = getDaysSinceUpdate();
              const lastUpdatedDate = state.lastUpdated ? new Date(state.lastUpdated).toLocaleDateString() : 'Unknown';
              const dayStr = days === 1 ? 'day' : 'days';
              const daysText = days !== null ? `${days} ${dayStr} ago` : 'Unknown';

              return (
                <div key={index} className="flex items-start justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-green-900">
                      New version available for {container?.name || state.image} (New tag: {state.latestAvailableVersion || state.tag})
                    </p>
                    <p className="text-sm text-green-700 mb-1">{state.image}:{state.tag}</p>
                    <p className="text-xs text-green-600">
                      Image updated {daysText} on {lastUpdatedDate}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDismissUpdate(state.image, state.tag)}
                    className="px-3 py-1 text-sm text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 rounded transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monitored Images */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Monitored Images</h2>
        {containers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {containers
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((container, index) => {
                const containerState = containerStates.find(
                  state => state.image === container.imagePath && state.tag === (container.tag || 'latest')
                );
                return (
                  <ContainerCard
                    key={`${container.name}-${container.imagePath}`}
                    container={container}
                    containerState={containerState}
                    onUpdate={(updatedContainer) => handleUpdateContainer(index, updatedContainer)}
                    onDelete={() => handleDeleteContainer(index)}
                    onCheck={() => handleCheckSingle(index)}
                    isChecking={checkingIndex === index}
                  />
                );
              })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Container className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No images configured
              </h3>
              <p className="text-muted-foreground mb-6">
                Add your first image to start monitoring for updates
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Image</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <AddContainerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={onAddContainer}
      />

      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onImport={handleBulkImport}
        onExport={handleExport}
      />

      <CheckConfirmationModal
        isOpen={isCheckConfirmationOpen}
        onClose={() => setIsCheckConfirmationOpen(false)}
        onConfirm={performCheckRegistry}
        imageCount={containers.length}
        isChecking={progress.isChecking}
      />
    </div>
  );
}
