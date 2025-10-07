import { ContainerRegistry, ContainerState, CronConfig, NotificationConfig } from '../types';
import { DatabaseService } from './databaseService';

export class ConfigService {
  static async getContainers(): Promise<(ContainerRegistry & { source_agent_id?: string })[]> {
    const containers = await DatabaseService.getContainers();
    return containers.map((container: any) => ({
      name: container.name,
      imagePath: container.image_path,
      tag: container.tag === 'latest' ? undefined : container.tag,
      source_agent_id: container.source_agent_id || undefined
    }));
  }

  static async saveContainers(containers: ContainerRegistry[]): Promise<void> {
    // Clear existing containers
    const existingContainers = await DatabaseService.getContainers();
    for (const container of existingContainers) {
      await DatabaseService.deleteContainer(container.id);
    }

    // Add new containers
    for (const container of containers) {
      await DatabaseService.addContainer({
        name: container.name,
        image_path: container.imagePath,
        tag: container.tag || 'latest'
      });
    }
  }

  static async getContainerState(): Promise<ContainerState[]> {
    const states = await DatabaseService.getContainerStates();
    return states.map((state: any) => ({
      image: state.image,
      tag: state.tag,
      currentSha: state.current_sha,
      lastChecked: state.last_checked,
      hasUpdate: Boolean(state.has_update),
      hasNewerTag: Boolean(state.has_newer_tag),
      latestSha: state.latest_sha,
      lastUpdated: state.last_updated,
      isNew: Boolean(state.is_new),
      statusMessage: state.status_message,
      error: Boolean(state.error),
      platform: state.platform,
      latestAvailableTag: state.latest_available_tag,
      latestAvailableUpdated: state.latest_available_updated,
      updateAcknowledged: Boolean(state.update_acknowledged),
      updateAcknowledgedAt: state.update_acknowledged_at
    }));
  }

  static async saveContainerState(state: ContainerState[]): Promise<void> {
    // Clear existing states
    await DatabaseService.clearContainerStates();

    // Add new states
    for (const containerState of state) {
      await DatabaseService.upsertContainerState({
        image: containerState.image,
        tag: containerState.tag,
        current_sha: containerState.currentSha,
        last_checked: containerState.lastChecked,
        has_update: containerState.hasUpdate,
        has_newer_tag: containerState.hasNewerTag,
        latest_sha: containerState.latestSha,
        last_updated: containerState.lastUpdated,
        is_new: containerState.isNew,
        status_message: containerState.statusMessage,
        error: containerState.error,
        platform: containerState.platform,
        latest_available_tag: containerState.latestAvailableTag,
        latest_available_updated: containerState.latestAvailableUpdated,
        update_acknowledged: containerState.updateAcknowledged,
        update_acknowledged_at: containerState.updateAcknowledgedAt
      });
    }
  }

  static async getCronConfig(): Promise<CronConfig> {
    return await DatabaseService.getCronConfig();
  }

  static async saveCronConfig(config: CronConfig): Promise<void> {
    console.log('SAVE CALLED FROM:', new Error().stack?.split('\n')[2]?.trim());
    await DatabaseService.updateCronConfig({
      schedule: config.schedule,
      enabled: config.enabled,
      timezone: config.timezone,
      isRunning: config.isRunning
    });
    console.log('Cron config saved:', config);
  }

  static async getNotificationConfig(): Promise<NotificationConfig> {
    return await DatabaseService.getNotificationConfig();
  }

  static async saveNotificationConfig(config: NotificationConfig): Promise<void> {
    await DatabaseService.updateNotificationConfig(config);
  }
}
