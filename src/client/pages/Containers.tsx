import { useState, useMemo } from 'react';
import { Plus, RefreshCw, Upload, Download, Search, X } from 'lucide-react';
import { ContainerRegistry, ContainerState } from '../types';
import { ContainerTable } from '../components/ContainerTable';
import { AddContainerModal } from '../components/AddContainerModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { CheckConfirmationModal } from '../components/CheckConfirmationModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';
import { ResponsiveSearchControls } from '../components/layout/ResponsiveSearchControls';
import { useCheck } from '../contexts/CheckContext';

interface ContainersProps {
  containers: ContainerRegistry[];
  containerStates: ContainerState[];
  onAddContainer: (container: ContainerRegistry) => Promise<void>;
  onUpdateContainer: (index: number, container: ContainerRegistry) => Promise<void>;
  onDeleteContainer: (index: number) => Promise<void>;
  onCheckRegistry: () => Promise<void>;
  onRefreshContainerStates: () => Promise<void>;
}

export function Containers({
  containers,
  containerStates,
  onAddContainer,
  onUpdateContainer,
  onDeleteContainer,
  onCheckRegistry,
  onRefreshContainerStates,
}: ContainersProps) {
  const { progress, startCheck, updateProgress, completeCheck, cancelCheck } = useCheck();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [checkingIndex, setCheckingIndex] = useState<number | null>(null);
  const [isCheckConfirmationOpen, setIsCheckConfirmationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddContainer = async (container: ContainerRegistry) => {
    await onAddContainer(container);
  };

  const handleUpdateContainer = async (index: number, container: ContainerRegistry) => {
    try {
      await onUpdateContainer(index, container);
    } catch (error) {
      console.error('Error updating container:', error);
    }
  };

  const handleDeleteContainer = async (index: number) => {
    if (confirm('Are you sure you want to delete this container?')) {
      try {
        await onDeleteContainer(index);
      } catch (error) {
        console.error('Error deleting container:', error);
      }
    }
  };

  const handleBulkDelete = async (indices: number[]) => {
    if (indices.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${indices.length} container(s)?`)) {
      try {
        // Sort indices in descending order to maintain correct indices during deletion
        const sortedIndices = [...indices].sort((a, b) => b - a);
        
        // Delete in descending order to maintain correct indices
        for (const index of sortedIndices) {
          await onDeleteContainer(index);
        }
      } catch (error) {
        console.error('Error bulk deleting containers:', error);
      }
    }
  };

  const handleCheckAll = async () => {
    // Show confirmation if there are 40 or more images
    if (containers.length >= 40) {
      setIsCheckConfirmationOpen(true);
      return;
    }
    
    // Proceed directly if less than 40 images
    await performCheckAll();
  };

  const performCheckAll = async () => {
    if (progress.isChecking) {
      return; // Already checking
    }

    startCheck(containers.length);
    setIsCheckingAll(true);
    
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
      await onRefreshContainerStates();
      
      // Force page refresh to ensure UI is updated with latest data
      setTimeout(() => {
        window.location.reload();
      }, 1000); // 1 second delay to allow any final processing
      
    } catch (error) {
      console.error('Error checking all registries:', error);
    } finally {
      setIsCheckingAll(false);
      completeCheck();
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
    } finally {
      setCheckingIndex(null);
    }
  };

  const handleDismissUpdate = async (container: ContainerRegistry) => {
    try {
      const response = await fetch('/api/config/containers/dismiss-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imagePath: container.imagePath,
          tag: container.tag || 'latest'
        }),
      });
      
      if (response.ok) {
        await onRefreshContainerStates();
      } else {
        console.error('Failed to dismiss update:', response.statusText);
      }
    } catch (error) {
      console.error('Error dismissing update:', error);
    }
  };

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

  // Filter containers based on search query
  const filteredContainers = useMemo(() => {
    if (!searchQuery) return containers;
    
    const query = searchQuery.toLowerCase();
    return containers.filter(container => {
      const name = container.name.toLowerCase();
      const imagePath = container.imagePath.toLowerCase();
      const tag = (container.tag || 'latest').toLowerCase();
      
      return name.includes(query) || imagePath.includes(query) || tag.includes(query);
    });
  }, [containers, searchQuery]);

  const headerActions = (
    <>
      <button
        onClick={() => setIsBulkImportModalOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Upload className="w-4 h-4" />
        <span>Import List</span>
      </button>
      <button
        onClick={handleExport}
        disabled={containers.length === 0}
        className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        <span>Export List</span>
      </button>
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>+ Add Image</span>
      </button>
      <button
        onClick={handleCheckAll}
        disabled={isCheckingAll || containers.length === 0}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-4 h-4 ${isCheckingAll ? 'animate-spin' : ''}`} />
        <span>{isCheckingAll ? 'Checking...' : 'Check All'}</span>
      </button>
      <ThemeToggle />
    </>
  );

  return (
    <div>
      <PageHeader
        title="Image Details"
        description="Monitor and configure your Docker images"
        actions={headerActions}
      />

      <PageContent>
        {/* Search Bar */}
        {containers.length > 0 && (
          <ResponsiveSearchControls
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* Results Count */}
        {searchQuery && containers.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredContainers.length} of {containers.length} containers
          </div>
        )}

        {containers.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
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
                <span>Add Image</span>
              </button>
            </div>
          </div>
        ) : filteredContainers.length === 0 && searchQuery ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No containers found
              </h3>
              <p className="text-muted-foreground mb-6">
                No containers match your search "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Clear Search
              </button>
            </div>
          </div>
        ) : (
          <ContainerTable
            containers={filteredContainers}
            containerStates={containerStates}
            onUpdate={(index) => {
              // Find the original index in the unfiltered array
              const container = filteredContainers[index];
              const originalIndex = containers.findIndex(
                c => c.imagePath === container.imagePath && c.tag === container.tag
              );
              return handleUpdateContainer(originalIndex, container);
            }}
            onDelete={async (index) => {
              // Find the original index in the unfiltered array
              const container = filteredContainers[index];
              const originalIndex = containers.findIndex(
                c => c.imagePath === container.imagePath && c.tag === container.tag
              );
              if (originalIndex === -1) {
                console.error('Could not find original index for container:', container);
                return;
              }
              await handleDeleteContainer(originalIndex);
            }}
            onBulkDelete={(indices) => {
              // Map filtered indices to original indices
              const originalIndices = indices.map(i => {
                const container = filteredContainers[i];
                const originalIndex = containers.findIndex(
                  c => c.imagePath === container.imagePath && c.tag === container.tag
                );
                if (originalIndex === -1) {
                  console.error('Could not find original index for container:', container);
                }
                return originalIndex;
              }).filter(index => index !== -1); // Remove any invalid indices
              
              if (originalIndices.length !== indices.length) {
                console.warn('Some selected items could not be found in the original containers list');
              }
              
              handleBulkDelete(originalIndices);
            }}
            onCheck={(index) => {
              // Find the original index in the unfiltered array
              const container = filteredContainers[index];
              const originalIndex = containers.findIndex(
                c => c.imagePath === container.imagePath && c.tag === container.tag
              );
              handleCheckSingle(originalIndex);
            }}
            onDismissUpdate={handleDismissUpdate}
            checkingIndex={checkingIndex !== null ? (
              // Map checking index from original to filtered
              filteredContainers.findIndex(c => 
                c.imagePath === containers[checkingIndex]?.imagePath && 
                c.tag === containers[checkingIndex]?.tag
              )
            ) : null}
          />
        )}
      </PageContent>

      <AddContainerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddContainer}
      />

      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onImport={handleBulkImport}
        onExport={handleExport}
      />

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
        onConfirm={performCheckAll}
        imageCount={containers.length}
        isChecking={progress.isChecking}
      />
    </div>
  );
}
