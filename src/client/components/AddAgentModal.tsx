import { useState } from 'react';
import { X, Copy, Check, Plus } from 'lucide-react';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAgent: (name: string) => Promise<{ composeYaml: string; agentId: string }>;
}

export function AddAgentModal({ isOpen, onClose, onCreateAgent }: AddAgentModalProps) {
  const [step, setStep] = useState<'name' | 'compose'>('name');
  const [agentName, setAgentName] = useState('');
  const [composeYaml, setComposeYaml] = useState('');
  const [agentId, setAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!agentName.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await onCreateAgent(agentName.trim());
      setComposeYaml(result.composeYaml);
      setAgentId(result.agentId);
      setStep('compose');
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(composeYaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = composeYaml;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setStep('name');
    setAgentName('');
    setComposeYaml('');
    setAgentId('');
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">
            {step === 'name' ? 'Add New Agent' : 'Agent Created'}
          </h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'name' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="agentName" className="block text-sm font-medium mb-2">
                  Agent Name
                </label>
                <input
                  id="agentName"
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter a name for your agent"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              
              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-border rounded hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!agentName.trim() || loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Agent
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'compose' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Agent "{agentName}" has been created successfully. Copy the docker-compose configuration below and run it on your remote server.
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Docker Compose Configuration</label>
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-2 px-3 py-1 text-sm border border-border rounded hover:bg-accent"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs whitespace-pre-wrap border border-border max-h-64">
                  {composeYaml}
                </pre>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Next Steps:</h4>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>1. Save the configuration above to a file named <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">docker-compose.yml</code></li>
                  <li>2. Run <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">docker-compose up -d</code> on your remote server</li>
                  <li>3. The agent will automatically connect and appear in your dashboard</li>
                </ol>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
