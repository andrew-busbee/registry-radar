import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Settings, Clock } from 'lucide-react';
import { AgentCard } from '../components/AgentCard';
import { AddAgentModal } from '../components/AddAgentModal';
import { EditAgentModal } from '../components/EditAgentModal';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
}

interface AgentListItem {
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
}

export function Agents() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<{ id: string; name: string; host?: string } | null>(null);
  const [heartbeatInterval, setHeartbeatInterval] = useState<number>(120);
  const [configLoading, setConfigLoading] = useState(false);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentConfig = async () => {
    try {
      const res = await fetch('/api/agents/config');
      const data = await res.json();
      setHeartbeatInterval(data.heartbeatIntervalSeconds);
    } catch (e: any) {
      console.error('Failed to load agent config:', e);
    }
  };

  const updateAgentConfig = async (newInterval: number) => {
    try {
      setConfigLoading(true);
      const res = await fetch('/api/agents/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heartbeatIntervalSeconds: newInterval })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update configuration');
      }
      
      setHeartbeatInterval(newInterval);
    } catch (e: any) {
      setError(e?.message || 'Failed to update agent configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchAgentConfig();
  }, []);

  const handleCreateAgent = async (name: string, ipAddress?: string) => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ipAddress })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create agent');
    }
    const data = await res.json();
    await fetchAgents(); // Refresh the agents list
    return { composeYaml: data.composeYaml, agentId: data.agentId };
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete agent');
      }
      await fetchAgents(); // Refresh the agents list
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    }
  };

  const handleEditAgent = (agentId: string, currentName: string, currentHost?: string) => {
    setEditingAgent({ id: agentId, name: currentName, host: currentHost });
    setShowEditModal(true);
  };

  const handleUpdateAgent = async (newName: string, ipAddress?: string) => {
    if (!editingAgent) return;
    
    try {
      // Create host display string
      let hostDisplay = newName;
      if (ipAddress && ipAddress.trim()) {
        hostDisplay = `${newName} (${ipAddress.trim()})`;
      }

      const res = await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, host: hostDisplay })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update agent');
      }
      await fetchAgents(); // Refresh the agents list
    } catch (e: any) {
      throw new Error(e?.message || 'Update failed');
    }
  };

  const headerActions = (
    <>
      <button
        onClick={fetchAgents}
        disabled={loading}
        className="inline-flex items-center px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Refresh agent status"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
      <button
        onClick={() => setShowAddModal(true)}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" /> Add Agent
      </button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Registry Radar Agents"
        description="Manage and monitor your Registry Radar agents"
        actions={headerActions}
      />

      <PageContent>
        {/* Agent Configuration Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-foreground">Agent Configuration</h3>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <label htmlFor="heartbeat-interval" className="text-sm font-medium text-foreground">
                Heartbeat Interval:
              </label>
            </div>
            
            <select
              id="heartbeat-interval"
              value={heartbeatInterval}
              onChange={(e) => updateAgentConfig(parseInt(e.target.value))}
              disabled={configLoading}
              className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes (default)</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
              <option value={900}>15 minutes</option>
              <option value={1800}>30 minutes</option>
            </select>
            
            {configLoading && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Agents will check in with the server at this interval. Changes take effect on the next heartbeat.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading agents...</div>
          </div>
        ) : (
          <>
            {agents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">No agents configured yet</div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create Your First Agent
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onDelete={handleDeleteAgent}
                    onEdit={handleEditAgent}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </PageContent>

      <AddAgentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreateAgent={handleCreateAgent}
      />

      <EditAgentModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAgent(null);
        }}
        currentName={editingAgent?.name || ''}
        currentHost={editingAgent?.host}
        onUpdateAgent={handleUpdateAgent}
      />
    </div>
  );
}



