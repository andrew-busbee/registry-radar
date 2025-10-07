import { useState } from 'react';
import { Trash2, Server, Container, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
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
}

export function AgentCard({ agent, onDelete }: AgentCardProps) {
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
    if (!agent.lastSeenAt) return 'Never';
    const lastSeen = new Date(agent.lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 p-1 rounded"
          title="Delete agent"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Agent Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Server className="w-3 h-3" />
          <span>{agent.host || 'Unknown host'}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Last seen: {getLastSeenText()}</span>
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

      {/* Container Summary */}
      {agent.containers && (agent.containers.running.length > 0 || agent.containers.stopped.length > 0) && (
        <div className="border-t pt-3">
          <div className="flex items-center space-x-2 mb-2">
            <Container className="w-4 h-4" />
            <span className="text-sm font-medium">Containers</span>
          </div>
          <div className="flex space-x-4 text-sm">
            {agent.containers.running.length > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {agent.containers.running.length} running
              </span>
            )}
            {agent.containers.stopped.length > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {agent.containers.stopped.length} stopped
              </span>
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
