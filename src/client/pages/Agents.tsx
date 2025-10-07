import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { AgentCard } from '../components/AgentCard';
import { AddAgentModal } from '../components/AddAgentModal';

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

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateAgent = async (name: string) => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Registry Radar Agents</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Agent
        </button>
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
                />
              ))}
            </div>
          )}
        </>
      )}

      <AddAgentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreateAgent={handleCreateAgent}
      />
    </div>
  );
}



