import { useState } from 'react';
import { Plus, RefreshCw, Upload, Download } from 'lucide-react';
import { ContainerRegistry, ContainerState, groupContainersByAge, getAgeGroupInfo, GroupedContainer } from '../types';
import { ContainerCard } from '../components/ContainerCard';
import { AddContainerModal } from '../components/AddContainerModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { CheckConfirmationModal } from '../components/CheckConfirmationModal';
import { useCheck } from '../contexts/CheckContext';

interface ContainersProps {
  containers: ContainerRegistry[];
  containerStates: ContainerState[];
  onAddContainer: (container: ContainerRegistry) => Promise<void>;
  onUpdateContainer: (index: number, container: ContainerRegistry) => Promise<void>;
  onDeleteContainer: (index: number) => Promise<void>;
  onCheckRegistry: () => Promise<void>;
}

export function Containers({
  containers,
  containerStates,
  onAddContainer,
  onUpdateContainer,
  onDeleteContainer,
  onCheckRegistry,
}: ContainersProps) {
  const { progress, startCheck, updateProgress, completeCheck, cancelCheck } = useCheck();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [checkingIndex, setCheckingIndex] = useState<number | null>(null);
  const [isCheckConfirmationOpen, setIsCheckConfirmationOpen] = useState(false);

  const handleAddContainer = async (container: ContainerRegistry) => {
    await onAddContainer(container);
  };

  const handleUpdateContainer = async (index: number, container: ContainerRegistry) => {
    await onUpdateContainer(index, container);
  };

  const handleDeleteContainer = async (index: number) => {
    if (confirm('Are you sure you want to delete this container?')) {
      await onDeleteContainer(index);
    }
  };

  const handleCheckAll = async () => {
    // Show confirmation if there are 10 or more images
    if (containers.length >= 10) {
      setIsCheckConfirmationOpen(true);
      return;
    }
    
    // Proceed directly if less than 10 images
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
      const statesResponse = await fetch('/api/registry/states', { credentials: 'include' });
      const states = await statesResponse.json();
      // Note: In a real app, you'd update the parent state here
      
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
        // Refresh container states
        const statesResponse = await fetch('/api/registry/states', { credentials: 'include' });
        const states = await statesResponse.json();
        // Note: In a real app, you'd update the parent state here
        // For now, we'll just log success
        console.log('Container checked successfully');
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

  const getContainerState = (container: ContainerRegistry): ContainerState | undefined => {
    return containerStates.find(state => 
      state.image === container.imagePath && state.tag === container.tag
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Image Details</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and configure your docker images
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCheckAll}
            disabled={isCheckingAll || containers.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingAll ? 'animate-spin' : ''}`} />
            <span>{isCheckingAll ? 'Checking...' : 'Check All'}</span>
          </button>
          <button
            onClick={handleExport}
            disabled={containers.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
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
            <span>Add Container</span>
          </button>
        </div>
      </div>

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
      ) : (
        <div className="space-y-6">
          {(() => {
            const groupedContainers = groupContainersByAge(containers, containerStates);
            const groupedByAge = groupedContainers.reduce((acc, groupedContainer) => {
              if (!acc[groupedContainer.ageGroup]) {
                acc[groupedContainer.ageGroup] = [];
              }
              acc[groupedContainer.ageGroup].push(groupedContainer);
              return acc;
            }, {} as Record<string, GroupedContainer[]>);
            
            return Object.entries(groupedByAge).map(([ageGroup, ageGroupContainers]) => {
              const groupInfo = getAgeGroupInfo(ageGroup as any);
              
              return (
                <div key={ageGroup}>
                  <div className="mb-4 pb-2 border-b border-border">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                      <span>{groupInfo.emoji}</span>
                      <span>{groupInfo.label}</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ageGroupContainers.map((groupedContainer) => {
                      const originalIndex = containers.findIndex(c => 
                        c.imagePath === groupedContainer.container.imagePath && 
                        c.tag === groupedContainer.container.tag
                      );
                      
                      return (
                        <ContainerCard
                          key={`${groupedContainer.container.imagePath}-${groupedContainer.container.tag}`}
                          container={groupedContainer.container}
                          containerState={groupedContainer.state}
                          onUpdate={(updatedContainer) => handleUpdateContainer(originalIndex, updatedContainer)}
                          onDelete={() => handleDeleteContainer(originalIndex)}
                          onCheck={() => handleCheckSingle(originalIndex)}
                          isChecking={checkingIndex === originalIndex}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

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
