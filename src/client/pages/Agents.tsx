import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

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

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createResult, setCreateResult] = useState<{ composeYaml: string; enrollToken: string; agentId: string } | null>(null);

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

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError(null);
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create agent');
      }
      const data = await res.json();
      setCreateResult({ composeYaml: data.composeYaml, enrollToken: data.enrollToken, agentId: data.agentId });
      setNewName('');
      fetchAgents();
    } catch (e: any) {
      setError(e?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Registry Radar Agents</h2>
        <div className="flex items-center space-x-2">
          <input
            className="border border-border rounded px-2 py-1 bg-background"
            placeholder="Agent name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            className="inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50"
            onClick={handleCreate}
            disabled={!newName || creating}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Agent
          </button>
        </div>
      </div>

      {error && <div className="text-destructive mb-2">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {agents.map(a => (
            <div key={a.id} className="border border-border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-lg">{a.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {a.status} • {a.host || 'unknown host'} • created {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{a.version || ''}</div>
              </div>
              
              {a.containers && (a.containers.running.length > 0 || a.containers.stopped.length > 0) && (
                <div className="space-y-3">
                  {a.containers.running.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                        Running Containers ({a.containers.running.length})
                      </div>
                      <div className="space-y-1">
                        {a.containers.running.map(container => (
                          <div key={container.id} className="text-sm text-foreground bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{container.name}</div>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Running
                              </span>
                            </div>
                            <div className="text-muted-foreground">{container.image}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {a.containers.stopped.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Stopped Containers ({a.containers.stopped.length})
                      </div>
                      <div className="space-y-1">
                        {a.containers.stopped.map(container => (
                          <div key={container.id} className="text-sm text-foreground bg-gray-50 dark:bg-gray-900/20 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{container.name}</div>
                              {container.status === 'exited' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  Exited
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                  {container.status}
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground">{container.image}</div>
                            {container.status === 'exited' && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Container exited (check logs for error details)
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(!a.containers || (a.containers.running.length === 0 && a.containers.stopped.length === 0)) && (
                <div className="text-sm text-muted-foreground italic">
                  No containers detected
                </div>
              )}
            </div>
          ))}
          {agents.length === 0 && <div className="text-muted-foreground">No agents yet. Create one above.</div>}
        </div>
      )}

      {createResult && (
        <div className="mt-6 border border-border rounded p-4">
          <div className="font-semibold mb-2">Enrollment Token (display once)</div>
          <div className="bg-muted p-2 rounded break-all mb-4">{createResult.enrollToken}</div>
          <div className="font-semibold mb-2">docker-compose.yml</div>
          <pre className="bg-muted p-3 rounded overflow-auto text-xs whitespace-pre-wrap">{createResult.composeYaml}</pre>
        </div>
      )}
    </div>
  );
}



