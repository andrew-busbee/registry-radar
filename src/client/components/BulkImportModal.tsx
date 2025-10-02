import React, { useState } from 'react';
import { ContainerRegistry } from '../types';
import { X, Upload, CheckCircle, AlertCircle, Copy, Download, FileText, Terminal, Code } from 'lucide-react';

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
  source?: 'docker-compose' | 'docker-command' | 'dockerfile' | 'line';
  originalLine?: string;
}

// Enhanced parsing utilities
class ContainerParser {
  // Image path validation regex - supports various registry formats
  private static readonly IMAGE_PATH_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?(\/[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?)*$/;
  
  // Registry domain regex
  private static readonly REGISTRY_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/;
  
  // Tag validation regex
  private static readonly TAG_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;

  // Validate image path format
  static validateImagePath(imagePath: string): { isValid: boolean; error?: string } {
    if (!imagePath || imagePath.trim().length === 0) {
      return { isValid: false, error: 'Image path cannot be empty' };
    }

    if (imagePath.length < 2) {
      return { isValid: false, error: 'Image path too short' };
    }

    if (imagePath.length > 255) {
      return { isValid: false, error: 'Image path too long (max 255 characters)' };
    }

    // Check for invalid characters
    if (/[\s@]/.test(imagePath)) {
      return { isValid: false, error: 'Image path contains invalid characters (spaces or @)' };
    }

    // Check for consecutive dots or slashes
    if (/\.{2,}|\/{2,}/.test(imagePath)) {
      return { isValid: false, error: 'Image path contains consecutive dots or slashes' };
    }

    // Check for leading/trailing slashes
    if (imagePath.startsWith('/') || imagePath.endsWith('/')) {
      return { isValid: false, error: 'Image path cannot start or end with slash' };
    }

    // Split into registry and repository parts
    const parts = imagePath.split('/');
    if (parts.length === 0) {
      return { isValid: false, error: 'Invalid image path format' };
    }

    // Validate registry part (first part if it contains dots or is a known registry)
    const firstPart = parts[0];
    if (firstPart.includes('.') || ['docker.io', 'ghcr.io', 'quay.io', 'lscr.io'].includes(firstPart)) {
      if (!this.REGISTRY_REGEX.test(firstPart)) {
        return { isValid: false, error: 'Invalid registry domain format' };
      }
    } else if (parts.length > 1) {
      // If no registry specified, first part should be a valid repository name
      if (!this.IMAGE_PATH_REGEX.test(firstPart)) {
        return { isValid: false, error: 'Invalid repository name format' };
      }
    }

    // Validate repository parts
    for (let i = 1; i < parts.length; i++) {
      if (!this.IMAGE_PATH_REGEX.test(parts[i])) {
        return { isValid: false, error: `Invalid repository part: ${parts[i]}` };
      }
    }

    return { isValid: true };
  }

  // Validate tag format
  static validateTag(tag: string): { isValid: boolean; error?: string } {
    if (!tag || tag === 'latest') {
      return { isValid: true };
    }

    if (tag.length > 128) {
      return { isValid: false, error: 'Tag too long (max 128 characters)' };
    }

    if (!this.TAG_REGEX.test(tag)) {
      return { isValid: false, error: 'Invalid tag format' };
    }

    return { isValid: true };
  }

  // Parse docker-compose content
  static parseDockerCompose(content: string): ParsedContainer[] {
    const containers: ParsedContainer[] = [];
    const lines = content.split('\n');
    let inServices = false;
    let currentService = '';
    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const currentIndent = line.length - line.trimStart().length;

      // Detect services section
      if (trimmed === 'services:' || trimmed.startsWith('version:')) {
        inServices = true;
        continue;
      }

      // Reset if we encounter top-level keys (same or less indent than services)
      if (inServices && currentIndent === 0 && trimmed && !trimmed.startsWith('#')) {
        // Check if this is a top-level key
        if (trimmed.endsWith(':') && !trimmed.includes(' ')) {
          inServices = false;
          continue;
        }
      }

      // Skip if not in services section
      if (!inServices) continue;

      // Detect service name (proper indentation level)
      if (trimmed && 
          !trimmed.startsWith('-') && 
          trimmed.endsWith(':') && 
          !trimmed.includes(' ') &&
          currentIndent > 0) {
        currentService = trimmed.replace(':', '');
        indentLevel = currentIndent;
        continue;
      }

      // Look for image: lines (should be indented more than service name)
      if (trimmed.startsWith('image:') && currentIndent > indentLevel) {
        const imageValue = trimmed.substring(6).trim().replace(/['"]/g, '');
        const parsed = this.parseImageString(imageValue, 'docker-compose', line);
        if (parsed) {
          parsed.originalLine = `services.${currentService}.image: ${imageValue}`;
          containers.push(parsed);
        }
      }
    }

    return containers;
  }

  // Parse docker run commands
  static parseDockerCommands(content: string): ParsedContainer[] {
    const containers: ParsedContainer[] = [];
    // More flexible regex to capture image names from docker run commands
    const dockerRunRegex = /(?:docker|podman)\s+run\s+(?:[^]*?\s)?([a-zA-Z0-9][a-zA-Z0-9._/-]*[a-zA-Z0-9](?::[a-zA-Z0-9][a-zA-Z0-9._-]*)?)/g;
    
    let match;
    while ((match = dockerRunRegex.exec(content)) !== null) {
      const imageString = match[1];
      if (imageString && 
          !imageString.startsWith('--') && 
          !imageString.startsWith('-') &&
          !imageString.includes('=') && // Skip environment variables
          !imageString.startsWith('/') && // Skip volume mounts
          !imageString.startsWith('\\')) { // Skip Windows paths
        const parsed = this.parseImageString(imageString, 'docker-command', match[0]);
        if (parsed) {
          containers.push(parsed);
        }
      }
    }

    return containers;
  }

  // Parse Dockerfile FROM statements
  static parseDockerfile(content: string): ParsedContainer[] {
    const containers: ParsedContainer[] = [];
    const fromRegex = /^FROM\s+(?:--platform=[^\s]+\s+)?([^\s]+)/gm;
    
    let match;
    while ((match = fromRegex.exec(content)) !== null) {
      const imageString = match[1];
      // Skip scratch and multi-stage build references
      if (imageString !== 'scratch' && !imageString.startsWith('--')) {
        const parsed = this.parseImageString(imageString, 'dockerfile', match[0]);
        if (parsed) {
          containers.push(parsed);
        }
      }
    }

    return containers;
  }

  // Parse a single image string (image:tag or image@digest)
  static parseImageString(imageString: string, source: ParsedContainer['source'], originalLine: string): ParsedContainer | null {
    if (!imageString || imageString.trim().length === 0) {
      return null;
    }

    // Normalize: remove surrounding quotes, inline comments, and optional leading "image:" key
    let normalized = imageString
      .trim()
      .replace(/^["']|["']$/g, '') // strip surrounding quotes if present
      .replace(/\s+#.*$/, '') // strip inline comments starting with # and preceding space
      .replace(/^image\s*:\s*/i, '') // remove leading "image:" if present
      .trim();

    // Handle digest format (ignore digest, use latest tag)
    let imagePath = normalized;
    let tag = 'latest';

    if (normalized.includes('@')) {
      // Remove digest part
      imagePath = normalized.split('@')[0];
    } else if (normalized.includes(':')) {
      // Extract tag
      const lastColonIndex = normalized.lastIndexOf(':');
      const potentialTag = normalized.substring(lastColonIndex + 1);
      
      // Check if this looks like a tag (not a port or path)
      if (potentialTag && !potentialTag.includes('/') && potentialTag.match(/^[a-zA-Z0-9._-]+$/)) {
        imagePath = normalized.substring(0, lastColonIndex);
        tag = potentialTag;
      }
    }

    // Validate image path and tag
    const pathValidation = this.validateImagePath(imagePath);
    const tagValidation = this.validateTag(tag);

    const isValid = pathValidation.isValid && tagValidation.isValid;
    const error = !pathValidation.isValid ? pathValidation.error : 
                  !tagValidation.isValid ? tagValidation.error : undefined;

    return {
      imagePath,
      tag,
      isValid,
      error,
      source,
      originalLine
    };
  }

  // Detect content type and parse accordingly
  static parseContent(content: string): ParsedContainer[] {
    const trimmed = content.trim();
    const containers: ParsedContainer[] = [];

    // Detect content type based on patterns
    const isDockerCompose = /^\s*(version:|services:)/m.test(content) || 
                           /^\s*\w+:\s*$/m.test(content);
    const hasDockerCommands = /(?:docker|podman)\s+run/.test(content);
    const isDockerfile = /^FROM\s+/m.test(content);

    if (isDockerCompose) {
      containers.push(...this.parseDockerCompose(content));
    }

    if (hasDockerCommands) {
      containers.push(...this.parseDockerCommands(content));
    }

    if (isDockerfile) {
      containers.push(...this.parseDockerfile(content));
    }

    // If no structured content detected, parse line by line
    if (containers.length === 0) {
      containers.push(...this.parseLineByLine(content));
    }

    // Remove duplicates based on imagePath:tag combination
    const uniqueContainers = containers.filter((container, index, self) => 
      index === self.findIndex(c => c.imagePath === container.imagePath && c.tag === container.tag)
    );

    return uniqueContainers;
  }

  // Original line-by-line parsing as fallback
  static parseLineByLine(content: string): ParsedContainer[] {
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    return lines.map(line => {
      const parsed = this.parseImageString(line, 'line', line);
      return parsed || {
        imagePath: line,
        tag: 'latest',
        isValid: false,
        error: 'Failed to parse image',
        source: 'line',
        originalLine: line
      };
    });
  }
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

  // Parse container list from text input using enhanced parser
  const parseContainerList = (text: string): ParsedContainer[] => {
    return ContainerParser.parseContent(text);
  };

  // Detect content type for better user feedback
  const detectContentType = (content: string) => {
    const isDockerCompose = /^\s*(version:|services:)/m.test(content) || 
                           /^\s*\w+:\s*$/m.test(content);
    const hasDockerCommands = /(?:docker|podman)\s+run/.test(content);
    const isDockerfile = /^FROM\s+/m.test(content);

    if (isDockerCompose) return { type: 'docker-compose', icon: FileText, label: 'Docker Compose' };
    if (hasDockerCommands) return { type: 'docker-commands', icon: Terminal, label: 'Docker Commands' };
    if (isDockerfile) return { type: 'dockerfile', icon: Code, label: 'Dockerfile' };
    return { type: 'text', icon: null, label: 'Text List' };
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
                  placeholder="Paste any of the following formats:&#10;&#10;📋 Simple list:&#10;nginx:alpine&#10;ghcr.io/user/repo:latest&#10;&#10;🐳 Docker Compose:&#10;services:&#10;  web:&#10;    image: nginx:alpine&#10;&#10;⚡ Docker commands:&#10;docker run -d redis:7&#10;&#10;📄 Dockerfile:&#10;FROM ubuntu:22.04"
                  className="w-full h-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                  disabled={isImporting}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <span>✨ Smart parsing: Docker Compose, commands, Dockerfiles, and text lists</span>
                    <span>🔍 Supports: ghcr.io, lscr.io, quay.io, docker.io, and custom registries</span>
                  </div>
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
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-foreground">Parsed Containers</h3>
                    {(() => {
                      const contentType = detectContentType(inputText);
                      const IconComponent = contentType.icon;
                      return (
                        <div className="flex items-center space-x-2 px-2 py-1 bg-muted rounded-md text-sm text-muted-foreground">
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          <span>{contentType.label}</span>
                        </div>
                      );
                    })()}
                  </div>
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
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1 min-w-0">
                          {container.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm font-medium">
                                {container.imagePath}:{container.tag}
                              </span>
                              {container.source && container.source !== 'line' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  container.source === 'docker-compose' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                                  container.source === 'docker-command' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' :
                                  container.source === 'dockerfile' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' :
                                  'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
                                }`}>
                                  {container.source === 'docker-compose' ? 'Compose' :
                                   container.source === 'docker-command' ? 'Command' :
                                   container.source === 'dockerfile' ? 'Dockerfile' : 'Text'}
                                </span>
                              )}
                            </div>
                            {container.originalLine && container.originalLine !== `${container.imagePath}:${container.tag}` && (
                              <div className="text-xs text-muted-foreground mt-1 font-mono bg-muted px-2 py-1 rounded">
                                {container.originalLine}
                              </div>
                            )}
                          </div>
                        </div>
                        {!container.isValid && container.error && (
                          <div className="text-xs text-red-600 text-right ml-2 max-w-xs">
                            {container.error}
                          </div>
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
