import { useState } from 'react';
import { Trash2, Edit, Server, Container, Clock, CheckCircle, XCircle, AlertCircle, ArrowUpCircle } from 'lucide-react';

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  tag: string;
  status: string;
  updateStatus: 'up_to_date' | 'update_available' | 'error' | 'unknown';
  lastChecked?: string;
  hasUpdate?: boolean;
}

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    tags?: string[];
    host?: string;
    version?: string;
    status: 'online' | 'offline' | 'disabled';
    createdAt: string;
    lastSeenAt?: string;
    containers?: {
      running: ContainerInfo[];
      stopped: ContainerInfo[];
    };
  };
  onDelete: (agentId: string) => void;
  onEdit: (agentId: string, currentName: string, currentHost?: string) => void;
}

export function AgentCard({ agent, onDelete, onEdit }: AgentCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'disabled':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case 'online':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'offline':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'disabled':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      default:
        return 'border-border bg-card';
    }
  };

  const getLastSeenText = () => {
    if (!agent.lastSeenAt) return { text: 'Never', color: 'text-gray-600 dark:text-gray-400' };
    
    const lastSeen = new Date(agent.lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Format the actual timestamp
    const timestamp = lastSeen.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // Format the relative time
    let relativeTime;
    if (diffMins < 1) {
      relativeTime = 'Just now';
    } else if (diffMins < 60) {
      relativeTime = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      relativeTime = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      relativeTime = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }

    // Determine color based on time since last seen
    let color;
    if (diffMins <= 5) {
      color = 'text-green-600 dark:text-green-400'; // Green for recent (≤5 minutes)
    } else if (diffMins <= 10) {
      color = 'text-yellow-600 dark:text-yellow-400'; // Yellow for 5-10 minutes
    } else {
      color = 'text-red-600 dark:text-red-400'; // Red for >10 minutes
    }

    return {
      text: `${timestamp} (${relativeTime})`,
      color
    };
  };

  const getUpdateStatusDisplay = (container: ContainerInfo) => {
    switch (container.updateStatus) {
      case 'up_to_date':
        return { text: 'Up to date', icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-600 dark:text-green-400' };
      case 'update_available':
        return { text: 'Update available', icon: <ArrowUpCircle className="w-3 h-3" />, color: 'text-orange-600 dark:text-orange-400' };
      case 'error':
        return { text: 'Error', icon: <XCircle className="w-3 h-3" />, color: 'text-red-600 dark:text-red-400' };
      case 'unknown':
      default:
        return { text: 'Unknown', icon: <Clock className="w-3 h-3" />, color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const handleDelete = () => {
    onDelete(agent.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h3 className="font-semibold text-lg">{agent.name}</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onEdit(agent.id, agent.name, agent.host)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/20 p-1 rounded"
            title="Edit agent"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 p-1 rounded"
            title="Delete agent"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Agent Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Server className="w-3 h-3" />
          <span>{agent.host || 'Remote Agent'}</span>
        </div>
        <div className={`flex items-center space-x-2 text-sm ${agent.status === 'offline' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
          <Clock className="w-3 h-3" />
          <span>
            {agent.status === 'offline' ? 'Status: Disconnected' : `Last seen: `}
            {agent.status !== 'offline' && (
              <span className={getLastSeenText().color}>
                {getLastSeenText().text}
              </span>
            )}
          </span>
        </div>
        {agent.version && (
          <div className="text-sm text-muted-foreground">
            Version: {agent.version}
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          Created: {new Date(agent.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Container Details */}
      {agent.containers && (agent.containers.running.length > 0 || agent.containers.stopped.length > 0) && (
        <div className="border-t pt-3">
          <div className="flex items-center space-x-2 mb-3">
            <Container className="w-4 h-4" />
            <span className="text-sm font-medium">Containers</span>
          </div>
          
          <div className="space-y-3">
            {/* Running Containers */}
            {agent.containers.running.length > 0 && (
              <div>
                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
                  Running ({agent.containers.running.length})
                </div>
                <div className="space-y-2">
                  {agent.containers.running.map((container) => {
                    const statusDisplay = getUpdateStatusDisplay(container);
                    return (
                      <div key={container.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-sm truncate">{container.name}</div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Running
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {container.image}:{container.tag}
                        </div>
                        <div className={`flex items-center space-x-1 text-xs ${statusDisplay.color}`}>
                          {statusDisplay.icon}
                          <span>{statusDisplay.text}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Stopped Containers */}
            {agent.containers.stopped.length > 0 && (
              <div>
                <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">
                  Stopped ({agent.containers.stopped.length})
                </div>
                <div className="space-y-2">
                  {agent.containers.stopped.map((container) => {
                    const statusDisplay = getUpdateStatusDisplay(container);
                    return (
                      <div key={container.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-sm truncate">{container.name}</div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            {container.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {container.image}:{container.tag}
                        </div>
                        <div className={`flex items-center space-x-1 text-xs ${statusDisplay.color}`}>
                          {statusDisplay.icon}
                          <span>{statusDisplay.text}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Agent</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete "{agent.name}"? This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-border rounded hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
