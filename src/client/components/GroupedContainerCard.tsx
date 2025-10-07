import { useState } from 'react';
import { ChevronDown, ChevronRight, Container, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { ContainerRegistry, ContainerState } from '../types';

interface GroupedContainerCardProps {
  containers: ContainerRegistry[];
  containerStates: ContainerState[];
  agentInfo: {
    count: number;
    names: string[];
  };
  onUpdate: (container: ContainerRegistry) => Promise<void>;
  onDelete: () => void;
  onCheck: () => void;
  onDismissUpdate?: () => Promise<void>;
  getAgentName: (agentId?: string) => string | null;
}

export function GroupedContainerCard({ 
  containers, 
  containerStates,
  agentInfo,
  onUpdate, 
  onDelete, 
  onCheck,
  onDismissUpdate,
  getAgentName
}: GroupedContainerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const firstContainer = containers[0];
  const containerState = containerStates.find(
    state => state.image === firstContainer.imagePath && state.tag === (firstContainer.tag || 'latest')
  );

  const getStatusIcon = () => {
    if (!containerState) {
      return <Clock className="w-5 h-5 text-gray-500" />;
    }
    
    if (containerState.error || containerState.statusMessage) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    
    if (containerState.hasUpdate || containerState.hasNewerTag) {
      return <AlertCircle className="w-5 h-5 text-orange-500" />;
    }
    
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (!containerState) {
      return 'Never Checked';
    }
    
    if (containerState.error || containerState.statusMessage) {
      return 'Error';
    }
    
    if (containerState.hasUpdate || containerState.hasNewerTag) {
      return 'Update Available';
    }
    
    return 'Up to Date';
  };

  const getStatusColor = () => {
    if (!containerState) {
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
    
    if (containerState.error || containerState.statusMessage) {
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
    }
    
    if (containerState.hasUpdate || containerState.hasNewerTag) {
      return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
    }
    
    return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className={`p-2 rounded-full ${
            !containerState
              ? 'bg-gray-100 dark:bg-gray-800/40'
              : (containerState.hasUpdate || containerState.hasNewerTag)
                ? 'bg-orange-100 dark:bg-orange-900/20'
                : 'bg-green-100 dark:bg-green-900/20'
          }`}>
            {getStatusIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg text-foreground">{firstContainer.imagePath}</h3>
              <div className="flex items-center gap-1">
                {/* Tag badge */}
                <div className="text-xs text-primary-foreground bg-primary px-2 py-1 rounded-full font-medium">
                  Tag: {firstContainer.tag || 'latest'}
                </div>
                {/* Agent count badge */}
                <div className="text-xs text-purple-800 bg-purple-100 dark:text-purple-200 dark:bg-purple-900 px-2 py-1 rounded-full font-medium">
                  {agentInfo.count} {agentInfo.count === 1 ? 'agent' : 'agents'}
                </div>
              </div>
            </div>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Agents: {agentInfo.names.join(', ')}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="space-y-2">
            {containers.map((container, index) => {
              const agentId = (container as any).source_agent_id;
              const agentName = getAgentName(agentId) || 'Local';
              const individualState = containerStates.find(
                state => state.image === container.imagePath && state.tag === (container.tag || 'latest')
              );
              
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex items-center space-x-2">
                    <Container className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{container.name}</span>
                    <span className="text-xs text-muted-foreground">({agentName})</span>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()}`}>
                    {individualState ? getStatusText() : 'Never Checked'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

