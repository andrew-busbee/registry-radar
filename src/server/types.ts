export interface ContainerRegistry {
  name: string;
  imagePath: string; // Full image path like "andrewbusbee/planning-poker" or "nginx"
  tag?: string; // Optional, defaults to 'latest'
  // registry and namespace are auto-detected from imagePath
}

export interface ContainerState {
  image: string;
  tag: string;
  currentSha: string;
  lastChecked: string;
  hasUpdate: boolean;
  hasNewerTag?: boolean;
  latestSha?: string;
  lastUpdated?: string; // When the image was last updated on the registry
  // New container flag
  isNew?: boolean; // Whether this is a newly added container (first-time monitoring)
  // Optional status message for errors or informational states
  statusMessage?: string;
  // Error flag for last check
  error?: boolean;
  // Platform information for multi-arch images
  platform?: string; // e.g., "linux/amd64"
  // Latest available tag information
  latestAvailableTag?: string;
  latestAvailableUpdated?: string;
}

export interface CronConfig {
  schedule: string;
  enabled: boolean;
}

export interface Notification {
  id: string;
  type: 'update' | 'error';
  message: string;
  timestamp: string;
  container?: string;
  read: boolean;
}

export interface RegistryCheckResult {
  image: string;
  tag: string;
  currentSha: string;
  latestSha: string;
  hasUpdate: boolean;
  lastChecked: string;
  lastUpdated?: string; // When the image was last updated on the registry
  // Optional status message for errors or informational states
  statusMessage?: string;
  // Error flag for this check result
  error?: boolean;
  // Platform information for multi-arch images
  platform?: string; // e.g., "linux/amd64"
  // Latest available tag information
  latestAvailableTag?: string;
  latestAvailableUpdated?: string;
}

export interface NotificationConfig {
  pushover?: {
    enabled: boolean;
    apiKey: string;
    userKey: string;
    devices?: string[];
  };
  discord?: {
    enabled: boolean;
    webhooks: {
      url: string;
      name: string;
    }[];
  };
  email?: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    fromEmail?: string;
    fromName?: string;
    toEmails: string[];
  };
  triggers: {
    onEveryRun: boolean;
    onNewUpdates: boolean;
    onErrors: boolean;
    onManualCheck: boolean;
  };
}