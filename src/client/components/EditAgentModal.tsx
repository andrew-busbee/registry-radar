import { useState } from 'react';
import { X } from 'lucide-react';

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onUpdateAgent: (name: string) => Promise<void>;
}

export function EditAgentModal({ isOpen, onClose, currentName, onUpdateAgent }: EditAgentModalProps) {
  const [agentName, setAgentName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!agentName.trim()) {
      setError('Agent name cannot be empty');
      return;
    }
    
    if (agentName.trim() === currentName) {
      onClose();
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await onUpdateAgent(agentName.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update agent name');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAgentName(currentName);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Edit Agent Name</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="editAgentName" className="block text-sm font-medium mb-2">
                Agent Name
              </label>
              <input
                id="editAgentName"
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
                onClick={handleSave}
                disabled={!agentName.trim() || loading}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
