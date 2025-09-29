import React, { useState } from 'react';
import { ContainerRegistry } from '../types';
import { X, Upload, CheckCircle, AlertCircle, Copy, Download } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (containers: ContainerRegistry[]) => Promise<{ success: boolean; errors: string[] }>;
  onExport: () => void;
}

interface ParsedContainer {
  imagePath: string;
  tag: string;
  isValid: boolean;
  error?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ 
  isOpen, 
  onClose, 
  onImport, 
  onExport 
}) => {
  const [inputText, setInputText] = useState('');
  const [parsedContainers, setParsedContainers] = useState<ParsedContainer[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: boolean; errors: string[] } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Parse container list from text input
  const parseContainerList = (text: string): ParsedContainer[] => {
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    return lines.map((line, index) => {
      try {
        let imagePath = '';
        let tag = 'latest';

        // Extract tag if present
        if (line.includes(':')) {
          const [imageName, imageTag] = line.split(':');
          imagePath = imageName;
          tag = imageTag;
        } else {
          imagePath = line;
        }

        // Basic validation
        if (!imagePath || imagePath.length < 3) {
          return {
            imagePath,
            tag,
            isValid: false,
            error: 'Invalid image path'
          };
        }

        return {
          imagePath,
          tag,
          isValid: true
        };
      } catch (error) {
        return {
          imagePath: line,
          tag: 'latest',
          isValid: false,
          error: 'Failed to parse'
        };
      }
    });
  };

  const handleParse = () => {
    const parsed = parseContainerList(inputText);
    setParsedContainers(parsed);
    setShowPreview(true);
  };

  const handleImport = async () => {
    const validContainers = parsedContainers.filter(c => c.isValid);
    
    if (validContainers.length === 0) {
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const containers: ContainerRegistry[] = validContainers.map(c => ({
        name: c.imagePath.split('/').pop() || c.imagePath,
        imagePath: c.imagePath,
        tag: c.tag
      }));

      const result = await onImport(containers);
      setImportResults(result);
      
      if (result.success) {
        // Clear form on success
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      setImportResults({
        success: false,
        errors: ['Import failed: ' + (error as Error).message]
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setInputText('');
    setParsedContainers([]);
    setShowPreview(false);
    setImportResults(null);
    onClose();
  };

  const handleExport = () => {
    onExport();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inputText);
  };

  if (!isOpen) return null;

  const validCount = parsedContainers.filter(c => c.isValid).length;
  const invalidCount = parsedContainers.filter(c => !c.isValid).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <Upload className="h-4 w-4 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Bulk Import Image Paths
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Input Section */}
            <div>
              <label htmlFor="container-list" className="block text-sm font-medium text-foreground mb-2">
                Image List
              </label>
              <div className="space-y-2">
                <textarea
                  id="container-list"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your container list here, one per line:&#10;ghcr.io/hotio/sonarr&#10;lscr.io/linuxserver/sabnzbd&#10;linuxserver/ffmpeg&#10;nginx:alpine&#10;redis:7"
                  className="w-full h-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                  disabled={isImporting}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Supports: ghcr.io, lscr.io, quay.io, docker.io, and custom registries</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center space-x-1 hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={handleExport}
                      className="flex items-center space-x-1 hover:text-foreground"
                    >
                      <Download className="h-3 w-3" />
                      <span>Export Current</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Parse Button */}
            {!showPreview && (
              <div className="flex justify-center">
                <button
                  onClick={handleParse}
                  disabled={!inputText.trim() || isImporting}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Parse & Preview
                </button>
              </div>
            )}

            {/* Preview Section */}
            {showPreview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-foreground">Bulk Import Image Paths</h3>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-green-600">
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      {validCount} valid
                    </span>
                    {invalidCount > 0 && (
                      <span className="text-red-600">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        {invalidCount} invalid
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                  {parsedContainers.map((container, index) => (
                    <div
                      key={index}
                      className={`p-3 border-b border-border last:border-b-0 ${
                        container.isValid ? 'bg-background' : 'bg-destructive/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {container.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        <span className="font-mono text-sm">
                          {container.imagePath}:{container.tag}
                        </span>
                        </div>
                        {!container.isValid && container.error && (
                          <span className="text-xs text-red-600">{container.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    disabled={isImporting}
                    className="flex-1 py-2 px-4 border border-border rounded-lg text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isImporting || validCount === 0}
                    className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                      </div>
                    ) : (
                      `Import ${validCount} Image${validCount !== 1 ? 's' : ''}`
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <div className={`p-4 rounded-lg border ${
                importResults.success 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center space-x-2">
                  {importResults.success ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {importResults.success ? 'Import Successful!' : 'Import Failed'}
                  </span>
                </div>
                {importResults.errors.length > 0 && (
                  <ul className="mt-2 text-sm list-disc list-inside">
                    {importResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
