// Global type declarations
declare global {
  const __APP_VERSION__: string;
}

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
  isRunning?: boolean;
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
  lastUpdated?: string;
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
  triggers: {
    onEveryRun: boolean;
    onNewUpdates: boolean;
    onErrors: boolean;
    onManualCheck: boolean;
  };
}

// Age grouping utilities
export type AgeGroup = 'unknown' | 'last-month' | '2-3-months' | '4-6-months' | '6-12-months' | 'over-year';

export interface GroupedContainer {
  container: ContainerRegistry;
  state: ContainerState;
  daysSinceUpdate: number;
  ageGroup: AgeGroup;
}

export const getDaysSinceUpdate = (lastUpdated?: string, lastChecked?: string): number => {
  const dateToUse = lastUpdated || lastChecked;
  if (!dateToUse) return 999; // Very old if no date available
  
  const lastUpdate = new Date(dateToUse);
  const now = new Date();
  const diffTime = now.getTime() - lastUpdate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const getAgeGroup = (days: number): AgeGroup => {
  if (days <= 30) return 'last-month';
  if (days <= 90) return '2-3-months';
  if (days <= 180) return '4-6-months';
  if (days <= 365) return '6-12-months';
  return 'over-year';
};

export const getAgeGroupInfo = (ageGroup: AgeGroup) => {
  switch (ageGroup) {
    case 'unknown':
      return { label: 'Update Status Unknown', emoji: '🟠', order: 0 };
    case 'last-month':
      return { label: 'Updated in Last Month (0-30 days)', emoji: '🟢', order: 1 };
    case '2-3-months':
      return { label: 'Updated 2-3 Months Ago (31-90 days)', emoji: '🟡', order: 2 };
    case '4-6-months':
      return { label: 'Updated 4-6 Months Ago (91-180 days)', emoji: '🟠', order: 3 };
    case '6-12-months':
      return { label: 'Updated 6-12 Months Ago (181-365 days)', emoji: '🔴', order: 4 };
    case 'over-year':
      return { label: 'Updated Over 1 Year Ago (365+ days)', emoji: '⚫', order: 5 };
  }
};

export const groupContainersByAge = (
  containers: ContainerRegistry[],
  states: ContainerState[]
): GroupedContainer[] => {
  return containers
    .map(container => {
      const state = states.find(s => s.image === container.imagePath && s.tag === (container.tag || 'latest'));
      
      // Check if this is a new container (has isNew flag)
      if (state?.isNew) {
        return {
          container,
          state: state,
          daysSinceUpdate: 0,
          ageGroup: 'unknown' as AgeGroup
        };
      }
      
      const daysSinceUpdate = getDaysSinceUpdate(state?.lastUpdated, state?.lastChecked);
      const ageGroup = getAgeGroup(daysSinceUpdate);
      
      return {
        container,
        state: state || {
          image: container.imagePath,
          tag: container.tag || 'latest',
          currentSha: '',
          lastChecked: new Date().toISOString(),
          hasUpdate: false
        },
        daysSinceUpdate,
        ageGroup
      };
    })
    .sort((a, b) => {
      // First sort by age group order
      const ageOrderA = getAgeGroupInfo(a.ageGroup).order;
      const ageOrderB = getAgeGroupInfo(b.ageGroup).order;
      if (ageOrderA !== ageOrderB) return ageOrderA - ageOrderB;
      
      // Then sort alphabetically by name within each group
      return a.container.name.localeCompare(b.container.name);
    });
};