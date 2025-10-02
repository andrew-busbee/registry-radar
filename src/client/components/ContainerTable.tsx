import { useState } from 'react';
import { RefreshCw, Trash2, Edit, CheckCircle, AlertCircle, Clock, X, ChevronUp, ChevronDown } from 'lucide-react';
import { ContainerRegistry, ContainerState } from '../types';

interface ContainerTableProps {
  containers: ContainerRegistry[];
  containerStates: ContainerState[];
  onUpdate: (index: number, container: ContainerRegistry) => Promise<void>;
  onDelete: (index: number) => void;
  onBulkDelete?: (indices: number[]) => void;
  onCheck: (index: number) => void;
  onDismissUpdate?: (container: ContainerRegistry) => Promise<void>;
  checkingIndex: number | null;
}

type SortField = 'name' | 'tag' | 'lastChecked' | 'lastUpdated' | 'daysOld' | 'status';
type SortDirection = 'asc' | 'desc';

export function ContainerTable({ 
  containers, 
  containerStates, 
  onUpdate, 
  onDelete,
  onBulkDelete, 
  onCheck,
  onDismissUpdate,
  checkingIndex 
}: ContainerTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<ContainerRegistry | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const getContainerState = (container: ContainerRegistry): ContainerState | undefined => {
    return containerStates.find(state => 
      state.image === container.imagePath && state.tag === (container.tag || 'latest')
    );
  };

  // Helper function to check if dismiss button should be shown
  const shouldShowDismissButton = (containerState?: ContainerState) => {
    if (!containerState || (!containerState.hasUpdate && !containerState.hasNewerTag)) {
      return false;
    }
    
    // Show button if:
    // - There is a SHA update and it hasn't been acknowledged, OR
    // - There is a newer semantic tag available (ack state doesn't apply to this case)
    return (containerState.hasUpdate && !containerState.updateAcknowledged) || !!containerState.hasNewerTag;
  };

  const getStatusIcon = (containerState?: ContainerState) => {
    if (!containerState) {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    
    if (!containerState.lastChecked || containerState.lastChecked === '') {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    
    if (containerState.error || containerState.statusMessage) {
      return <X className="w-4 h-4 text-red-500" />;
    }
    
    if ((containerState.hasUpdate || containerState.hasNewerTag) && !containerState.updateAcknowledged) {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
    
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = (containerState?: ContainerState) => {
    if (!containerState) {
      return 'Never Checked. Will compare with registry on next scheduled or manual check';
    }
    
    if (!containerState.lastChecked || containerState.lastChecked === '') {
      return 'Never Checked. Will compare with registry on next scheduled or manual check';
    }
    
    if (containerState.error || containerState.statusMessage) {
      return 'Error - check image and tag';
    }
    
    // Note: Do not use an interim "new image" status after first check; show normal statuses instead
    
    if ((containerState.hasUpdate || containerState.hasNewerTag) && !containerState.updateAcknowledged) {
      return 'Update Available';
    }
    
    return 'Up to date';
  };

  const getStatusColor = (containerState?: ContainerState) => {
    if (!containerState) {
      return 'text-gray-500';
    }
    
    if (!containerState.lastChecked || containerState.lastChecked === '') {
      return 'text-gray-500';
    }
    
    if (containerState.error || containerState.statusMessage) {
      return 'text-red-600';
    }
    
    if ((containerState.hasUpdate || containerState.hasNewerTag) && !containerState.updateAcknowledged) {
      return 'text-orange-600';
    }
    
    return 'text-green-600';
  };

  const getDaysSinceUpdate = (containerState?: ContainerState) => {
    if (!containerState?.lastUpdated) {
      return null;
    }
    
    const lastUpdated = new Date(containerState.lastUpdated);
    const now = new Date();
    const diffTime = now.getTime() - lastUpdated.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    return diffDays;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedContainers = [...containers].sort((a, b) => {
    const stateA = getContainerState(a);
    const stateB = getContainerState(b);
    
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'tag':
        const tagA = a.tag || 'latest';
        const tagB = b.tag || 'latest';
        comparison = tagA.localeCompare(tagB);
        break;
      case 'lastChecked':
        const lastCheckedA = stateA?.lastChecked || '';
        const lastCheckedB = stateB?.lastChecked || '';
        comparison = lastCheckedA.localeCompare(lastCheckedB);
        break;
      case 'lastUpdated':
        const lastUpdatedA = stateA?.lastUpdated || '';
        const lastUpdatedB = stateB?.lastUpdated || '';
        comparison = lastUpdatedA.localeCompare(lastUpdatedB);
        break;
      case 'daysOld':
        const daysA = getDaysSinceUpdate(stateA) ?? 999999;
        const daysB = getDaysSinceUpdate(stateB) ?? 999999;
        comparison = daysA - daysB;
        break;
      case 'status':
        const statusA = getStatusText(stateA);
        const statusB = getStatusText(stateB);
        comparison = statusA.localeCompare(statusB);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleEdit = (index: number, container: ContainerRegistry) => {
    setEditingIndex(index);
    setEditData({ ...container, tag: container.tag || 'latest' });
  };

  const handleSave = async (index: number) => {
    if (!editData) return;
    
    try {
      await onUpdate(index, editData);
      setEditingIndex(null);
      setEditData(null);
    } catch (error) {
      console.error('Error saving container:', error);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditData(null);
  };

  const handleToggleSelect = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === containers.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(containers.map((_, i) => i)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIndices.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedIndices.size} container(s)?`)) {
      if (onBulkDelete) {
        // Convert to array and sort in descending order (delete from end to start)
        const indicesToDelete = Array.from(selectedIndices).sort((a, b) => b - a);
        onBulkDelete(indicesToDelete);
        setSelectedIndices(new Set());
      }
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 opacity-30" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {selectedIndices.size > 0 && (
        <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-foreground">
            {selectedIndices.size} item{selectedIndices.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center space-x-2 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 sm:px-4 py-3 text-center w-12">
                <input
                  type="checkbox"
                  checked={selectedIndices.size === containers.length && containers.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  title="Select all"
                />
              </th>
              <th 
                className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-foreground cursor-pointer hover:bg-muted/70 transition-colors min-w-[200px]"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span>Monitored Image</span>
                  <SortIcon field="name" />
                </div>
              </th>
              <th 
                className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-foreground cursor-pointer hover:bg-muted/70 transition-colors min-w-[80px]"
                onClick={() => handleSort('tag')}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span>Tag</span>
                  <SortIcon field="tag" />
                </div>
              </th>
              <th 
                className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-foreground cursor-pointer hover:bg-muted/70 transition-colors min-w-[120px] hidden sm:table-cell"
                onClick={() => handleSort('lastChecked')}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span>Last Checked</span>
                  <SortIcon field="lastChecked" />
                </div>
              </th>
              <th 
                className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-foreground cursor-pointer hover:bg-muted/70 transition-colors min-w-[120px] hidden md:table-cell"
                onClick={() => handleSort('lastUpdated')}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span>Image Last Updated</span>
                  <SortIcon field="lastUpdated" />
                </div>
              </th>
              <th 
                className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-foreground cursor-pointer hover:bg-muted/70 transition-colors min-w-[100px] hidden md:table-cell"
                onClick={() => handleSort('daysOld')}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span>Days Old</span>
                  <SortIcon field="daysOld" />
                </div>
              </th>
              <th 
                className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-foreground cursor-pointer hover:bg-muted/70 transition-colors min-w-[120px]"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span>Status</span>
                  <SortIcon field="status" />
                </div>
              </th>
              <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-foreground min-w-[100px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedContainers.map((container, index) => {
              const containerState = getContainerState(container);
              const isEditing = editingIndex === index;
              
              return (
                <tr key={`${container.name}-${container.imagePath}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(index)}
                      onChange={() => handleToggleSelect(index)}
                      className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData?.name || ''}
                        onChange={(e) => setEditData({ ...editData!, name: e.target.value })}
                        className="w-full px-2 py-1 border border-input rounded bg-background text-foreground text-xs sm:text-sm"
                      />
                    ) : (
                      <div>
                        <div className="font-medium text-foreground text-xs sm:text-sm">{container.name}</div>
                        <div className="text-xs text-muted-foreground font-mono break-all">
                          {container.imagePath}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData?.tag || ''}
                        onChange={(e) => setEditData({ ...editData!, tag: e.target.value })}
                        className="w-full px-2 py-1 border border-input rounded bg-background text-foreground text-xs sm:text-sm"
                        placeholder="latest"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-foreground">
                        {container.tag || 'latest'}
                      </span>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 hidden sm:table-cell">
                    <div className="text-xs sm:text-sm text-foreground">
                      {containerState?.lastChecked ? 
                        new Date(containerState.lastChecked).toLocaleString() : 
                        'Never'
                      }
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 hidden md:table-cell">
                    <div className="text-xs sm:text-sm text-foreground">
                      {containerState?.lastUpdated ? 
                        new Date(containerState.lastUpdated).toLocaleDateString() : 
                        'Unknown'
                      }
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 hidden md:table-cell">
                    <div className="text-xs sm:text-sm text-foreground">
                      {containerState?.lastUpdated ? (
                        <>
                          <span className="font-medium">{getDaysSinceUpdate(containerState)}</span>
                          <span className="text-muted-foreground ml-1">days</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {getStatusIcon(containerState)}
                      <span className={`text-xs sm:text-sm font-medium ${getStatusColor(containerState)}`}>
                        {getStatusText(containerState)}
                      </span>
                    </div>
                    {containerState?.currentSha && (
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        SHA: {containerState.currentSha.substring(0, 12)}...
                      </div>
                    )}
                    {/* Show last checked info on mobile when hidden column */}
                    <div className="sm:hidden text-xs text-muted-foreground mt-1">
                      Last checked: {containerState?.lastChecked ? 
                        new Date(containerState.lastChecked).toLocaleDateString() : 
                        'Never'
                      }
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-end space-x-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSave(index)}
                            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="Save changes"
                          >
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {shouldShowDismissButton(containerState) && (
                            <button
                              onClick={() => onDismissUpdate?.(container)}
                              className="px-2 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30 rounded transition-colors font-medium"
                              title="Reset update notification"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => onCheck(index)}
                            disabled={checkingIndex === index}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
                            title="Check for updates"
                          >
                            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${checkingIndex === index ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleEdit(index, container)}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            title="Edit container"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(index)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete container"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
