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
  latestSha?: string;
  lastUpdated?: string; // When the image was last updated on the registry
  dismissed?: boolean; // Whether the user has dismissed this update
  dismissedSha?: string; // The SHA that was dismissed (to detect new updates)
  // Version tracking fields
  latestAvailableVersion?: string; // The latest version available (e.g., "1.2.5")
  trackingMode?: 'latest' | 'version'; // How this container should be tracked
  // New container flag
  isNew?: boolean; // Whether this is a newly added container (first-time monitoring)
  // Latest tag information
  latestTag?: string; // The actual latest tag available (e.g., "latest", "1.2.5", "15.4")
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
  // Version tracking fields
  latestAvailableVersion?: string; // The latest version available
  trackingMode?: 'latest' | 'version'; // How this container should be tracked
  availableTags?: string[]; // All available tags for version comparison
  // Latest tag information
  latestTag?: string; // The actual latest tag available
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
  triggers: {
    onEveryRun: boolean;
    onNewUpdates: boolean;
    onErrors: boolean;
    onManualCheck: boolean;
  };
}