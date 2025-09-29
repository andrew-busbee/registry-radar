import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { ContainerRegistry } from '../types';

interface AddContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (container: ContainerRegistry) => Promise<void>;
}

export function AddContainerModal({ isOpen, onClose, onAdd }: AddContainerModalProps) {
  const [formData, setFormData] = useState<ContainerRegistry>({
    name: '',
    imagePath: '',
    tag: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.imagePath) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Set default tag if not provided
      const containerData = {
        ...formData,
        tag: formData.tag || 'latest'
      };
      
      await onAdd(containerData);
      setFormData({
        name: '',
        imagePath: '',
        tag: '',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add container');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      imagePath: '',
      tag: '',
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Add Container</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              placeholder="e.g., My App"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Image Path *
            </label>
            <input
              type="text"
              value={formData.imagePath}
              onChange={(e) => setFormData({ ...formData, imagePath: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              placeholder="e.g., andrewbusbee/planning-poker, nginx, ghcr.io/user/repo"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the full image path. Examples: <code>nginx</code>, <code>user/app</code>, <code>ghcr.io/user/app</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tag (optional)
            </label>
            <input
              type="text"
              value={formData.tag}
              onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              placeholder="e.g., latest, v1.0.0 (defaults to 'latest' if empty)"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
              {error}
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Container</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
