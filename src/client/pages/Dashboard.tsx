import { useState, useMemo } from 'react';
import { RefreshCw, Container, AlertCircle, CheckCircle, Clock, Plus, X, Upload, Search, SlidersHorizontal, XCircle } from 'lucide-react';
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
      return 'Never Checked. Will compare with registry on next scheduled or manual check';
    }
    
    // Check if container has never been checked (empty lastChecked)
    if (!state.lastChecked || state.lastChecked === '') {
      return 'Never Checked. Will compare with registry on next scheduled or manual check';
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
  
  // Search, Sort, and Group state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'status'>('name');
  const [groupBy, setGroupBy] = useState<'none' | 'age' | 'registry' | 'status'>('none');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upToDate' | 'updates' | 'errors' | 'neverChecked'>('all');

  const handleCheckRegistry = async () => {
    // Show confirmation if there are 40 or more images
    if (containers.length >= 40) {
      setIsCheckConfirmationOpen(true);
      return;
    }
    
    // Proceed directly if less than 40 images
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
      await onRefreshContainerStates();
      
      // Force page refresh to ensure UI is updated with latest data
      setTimeout(() => {
        window.location.reload();
      }, 1000); // 1 second delay to allow any final processing
      
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

  // Helper: identify v-prefixed semantic version tags like v1.2.3 or versions with additional characters after semantic version like 0.1.0-beta.4
  const isVPrefixedVersionedTag = (tag?: string): boolean => {
    const normalizedTag = tag || 'latest';
    // Match v-prefixed versions like v1.2.3
    const vPrefixedPattern = /^v\d+\.\d+\.\d+/;
    // Match versions with additional characters after semantic version like 0.1.0-beta.4, 1.2.3-rc.1, etc.
    const extendedVersionPattern = /^\d+\.\d+\.\d+[^0-9]/;
    return vPrefixedPattern.test(normalizedTag) || extendedVersionPattern.test(normalizedTag);
  };

  // Compute stats
  const errorsSet = new Set(
    stateMatchesCurrent
      .filter(state => state.error || state.statusMessage)
      .map(state => `${state.image}@@${state.tag || 'latest'}`)
  );

  const warningsSet = new Set(
    containers
      .filter(c => isVPrefixedVersionedTag(c.tag))
      .map(c => `${c.imagePath}@@${c.tag || 'latest'}`)
  );

  // Union of errors and warnings for display count on the card and filter results
  const errorsAndWarningsSet = new Set<string>([...errorsSet, ...warningsSet]);

  const errorsAndWarnings = errorsAndWarningsSet.size;
  const upToDate = stateMatchesCurrent.filter(state => (state.lastChecked && state.lastChecked !== '') && !(state.hasUpdate || state.hasNewerTag) && !state.error && !state.statusMessage).length;
  const updatesAvailable = stateMatchesCurrent.filter(state => (state.lastChecked && state.lastChecked !== '') && (state.hasUpdate || state.hasNewerTag) && !state.updateAcknowledged && !state.error).length;
  const total = containers.length;
  // Preserve original neverChecked calculation based only on actual error states
  const errorsOnlyCount = stateMatchesCurrent.filter(state => state.error || state.statusMessage).length;
  const neverCheckedRaw = total - upToDate - updatesAvailable - errorsOnlyCount;
  const neverChecked = Math.max(0, neverCheckedRaw);

  const stats = {
    total,
    upToDate,
    updatesAvailable,
    errors: errorsAndWarnings,
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
        // Optimistically update local state so UI reflects immediately
        try {
          // Fetch latest states from server to keep in sync
          await onRefreshContainerStates();
        } catch {}
        // Also adjust the local view instantly
        const idx = containerStates.findIndex(s => s.image === container.imagePath && (s.tag || 'latest') === (container.tag || 'latest'));
        if (idx >= 0) {
          containerStates[idx] = {
            ...containerStates[idx],
            updateAcknowledged: true,
            hasUpdate: false,
            hasNewerTag: false,
            latestAvailableTag: undefined,
            latestAvailableUpdated: undefined,
          } as any;
        }
      } else {
        console.error('Failed to dismiss update:', response.statusText);
      }
    } catch (error) {
      console.error('Error dismissing update:', error);
    }
  };

  const getContainerState = (container: ContainerRegistry): ContainerState | undefined => {
    return containerStates.find(state => 
      state.image === container.imagePath && state.tag === container.tag
    );
  };

  // Filter, sort, and group containers
  const filteredAndSortedContainers = useMemo(() => {
    // 1. Filter by search query
    let filtered = containers.filter(container => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      const name = container.name.toLowerCase();
      const imagePath = container.imagePath.toLowerCase();
      const tag = (container.tag || 'latest').toLowerCase();
      
      return name.includes(query) || imagePath.includes(query) || tag.includes(query);
    });

    // 2. Filter by status (from stat cards)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(container => {
        const state = getContainerState(container);
        
        if (statusFilter === 'upToDate') {
          return state?.lastChecked && !(state.hasUpdate || state.hasNewerTag) && !state.error && !state.statusMessage;
        } else if (statusFilter === 'updates') {
          return state?.lastChecked && (state.hasUpdate || state.hasNewerTag) && !state.updateAcknowledged && !state.error;
        } else if (statusFilter === 'errors') {
          // Include actual errors/status plus v-prefixed version-tagged containers (tip case)
          const hasErrorOrStatus = !!(state?.error || state?.statusMessage);
          const isVVersionTag = isVPrefixedVersionedTag(container.tag);
          return hasErrorOrStatus || isVVersionTag;
        } else if (statusFilter === 'neverChecked') {
          return !state?.lastChecked || state.lastChecked === '';
        }
        
        return true;
      });
    }

    // 2. Sort containers
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'age') {
        const stateA = getContainerState(a);
        const stateB = getContainerState(b);
        const daysA = getDaysSinceUpdate(stateA) ?? 999999;
        const daysB = getDaysSinceUpdate(stateB) ?? 999999;
        return daysB - daysA; // Newest first
      } else if (sortBy === 'status') {
        const stateA = getContainerState(a);
        const stateB = getContainerState(b);
        const statusA = stateA?.hasUpdate ? 2 : stateA?.lastChecked ? 1 : 0;
        const statusB = stateB?.hasUpdate ? 2 : stateB?.lastChecked ? 1 : 0;
        return statusB - statusA; // Updates first
      }
      return 0;
    });

    // 3. Group containers if needed
    if (groupBy === 'none') {
      return [{ group: null, containers: filtered }];
    }

    const groups: { group: string; containers: ContainerRegistry[] }[] = [];
    
    if (groupBy === 'status') {
      const updates = filtered.filter(c => getContainerState(c)?.hasUpdate);
      const upToDate = filtered.filter(c => {
        const state = getContainerState(c);
        return state?.lastChecked && !state?.hasUpdate;
      });
      const neverChecked = filtered.filter(c => !getContainerState(c)?.lastChecked);
      
      if (updates.length > 0) groups.push({ group: 'Updates Available', containers: updates });
      if (upToDate.length > 0) groups.push({ group: 'Up to Date', containers: upToDate });
      if (neverChecked.length > 0) groups.push({ group: 'Never Checked', containers: neverChecked });
    } else if (groupBy === 'registry') {
      const registryMap = new Map<string, ContainerRegistry[]>();
      
      filtered.forEach(c => {
        const registry = c.imagePath.includes('ghcr.io') ? 'GitHub Container Registry' :
                        c.imagePath.includes('lscr.io') ? 'LinuxServer.io' :
                        c.imagePath.includes('/') ? 'Docker Hub (User)' : 'Docker Hub (Official)';
        
        if (!registryMap.has(registry)) {
          registryMap.set(registry, []);
        }
        registryMap.get(registry)!.push(c);
      });
      
      registryMap.forEach((containers, registry) => {
        groups.push({ group: registry, containers });
      });
    } else if (groupBy === 'age') {
      const lastMonth = filtered.filter(c => {
        const days = getDaysSinceUpdate(getContainerState(c));
        return days !== null && days <= 30;
      });
      const twoToThree = filtered.filter(c => {
        const days = getDaysSinceUpdate(getContainerState(c));
        return days !== null && days > 30 && days <= 90;
      });
      const fourToSix = filtered.filter(c => {
        const days = getDaysSinceUpdate(getContainerState(c));
        return days !== null && days > 90 && days <= 180;
      });
      const sixToTwelve = filtered.filter(c => {
        const days = getDaysSinceUpdate(getContainerState(c));
        return days !== null && days > 180 && days <= 365;
      });
      const overYear = filtered.filter(c => {
        const days = getDaysSinceUpdate(getContainerState(c));
        return days !== null && days > 365;
      });
      const unknown = filtered.filter(c => getDaysSinceUpdate(getContainerState(c)) === null);
      
      if (lastMonth.length > 0) groups.push({ group: '🟢 Updated in Last Month (0-30 days)', containers: lastMonth });
      if (twoToThree.length > 0) groups.push({ group: '🟡 Updated 2-3 Months Ago (31-90 days)', containers: twoToThree });
      if (fourToSix.length > 0) groups.push({ group: '🟠 Updated 4-6 Months Ago (91-180 days)', containers: fourToSix });
      if (sixToTwelve.length > 0) groups.push({ group: '🔴 Updated 6-12 Months Ago (181-365 days)', containers: sixToTwelve });
      if (overYear.length > 0) groups.push({ group: '⚫ Updated Over 1 Year Ago (365+ days)', containers: overYear });
      if (unknown.length > 0) groups.push({ group: '⚪ Update Status Unknown', containers: unknown });
    }
    
    return groups.length > 0 ? groups : [{ group: null, containers: filtered }];
  }, [containers, containerStates, searchQuery, sortBy, groupBy, statusFilter]);

  const totalFiltered = filteredAndSortedContainers.reduce((sum, g) => sum + g.containers.length, 0);

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border pb-4 -mx-6 px-6">
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
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Check All'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Only show when there are containers */}
      {containers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div 
            onClick={() => setStatusFilter(statusFilter === 'all' ? 'all' : 'all')}
            className={`bg-card border-2 rounded-lg p-4 cursor-pointer transition-all ${
              statusFilter === 'all' 
                ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                : 'border-border hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Container className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Monitored Images</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stats.total}</p>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'upToDate' ? 'all' : 'upToDate')}
            className={`bg-card border-2 rounded-lg p-4 cursor-pointer transition-all ${
              statusFilter === 'upToDate' 
                ? 'border-green-500 shadow-lg shadow-green-500/20' 
                : 'border-border hover:border-green-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Up to Date</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stats.upToDate}</p>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'updates' ? 'all' : 'updates')}
            className={`bg-card border-2 rounded-lg p-4 cursor-pointer transition-all ${
              statusFilter === 'updates' 
                ? 'border-orange-500 shadow-lg shadow-orange-500/20' 
                : 'border-border hover:border-orange-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">Updates Available</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stats.updatesAvailable}</p>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'errors' ? 'all' : 'errors')}
            className={`bg-card border-2 rounded-lg p-4 cursor-pointer transition-all ${
              statusFilter === 'errors' 
                ? 'border-red-500 shadow-lg shadow-red-500/20' 
                : 'border-border hover:border-red-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">Errors & Warnings</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stats.errors}</p>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'neverChecked' ? 'all' : 'neverChecked')}
            className={`bg-card border-2 rounded-lg p-4 cursor-pointer transition-all ${
              statusFilter === 'neverChecked' 
                ? 'border-gray-500 shadow-lg shadow-gray-500/20' 
                : 'border-border hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-muted-foreground">Never Checked</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stats.neverChecked}</p>
          </div>
        </div>
      )}

      {/* Recent Updates - Disabled */}
      {false && recentUpdates.length > 0 && (
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

      {/* Search, Sort, and Group Controls */}
      {containers.length > 0 && (
        <div className="bg-muted/30 border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Search</h2>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, image, or tag..."
                className="w-full pl-10 pr-10 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort and Group Controls */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'age' | 'status')}
                className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="name">Sort: Name</option>
                <option value="age">Sort: Age (Newest)</option>
                <option value="status">Sort: Status</option>
              </select>

              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'none' | 'age' | 'registry' | 'status')}
                className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="none">Group: None</option>
                <option value="age">Group: Age</option>
                <option value="registry">Group: Registry</option>
                <option value="status">Group: Status</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          {searchQuery && (
            <div className="mt-3 text-sm text-muted-foreground">
              Showing {totalFiltered} of {containers.length} containers
            </div>
          )}
        </div>
      )}

      {/* Monitored Images */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Monitored Images</h2>
        {containers.length > 0 ? (
          <>
            {filteredAndSortedContainers.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-6 last:mb-0">
                {group.group && (
                  <h3 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    {group.group} ({group.containers.length})
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.containers.map((container, index) => {
                const containerState = containerStates.find(
                  state => state.image === container.imagePath && state.tag === (container.tag || 'latest')
                );
                    const originalIndex = containers.findIndex(
                      c => c.imagePath === container.imagePath && c.tag === container.tag
                    );
                    return (
                      <ContainerCard
                        key={`${container.name}-${container.imagePath}`}
                        container={container}
                        containerState={containerState}
                        onUpdate={(updatedContainer) => handleUpdateContainer(originalIndex, updatedContainer)}
                        onDelete={() => handleDeleteContainer(originalIndex)}
                        onCheck={() => handleCheckSingle(originalIndex)}
                        onDismissUpdate={() => handleDismissUpdate(container)}
                        isChecking={checkingIndex === originalIndex}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* No results message */}
            {totalFiltered === 0 && searchQuery && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No containers found</h3>
                <p className="text-muted-foreground mb-4">
                  No containers match your search "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}
          </>
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
