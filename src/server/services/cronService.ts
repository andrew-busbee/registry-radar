import cron from 'node-cron';
import { CronConfig } from '../types';
import { ConfigService } from './configService';
import { RegistryService } from './registryService';
import { NotificationService } from './notificationService';

export class CronService {
  private static currentTask: cron.ScheduledTask | null = null;

  static async startCron(): Promise<void> {
    await this.stopCron(); // Stop any existing task
    
    const config = await ConfigService.getCronConfig();
    
    if (!config.enabled) {
      console.log('Cron is disabled');
      return;
    }

    console.log(`Starting cron job with schedule: ${config.schedule} (tz: ${config.timezone || 'UTC'})`);
    
    this.currentTask = cron.schedule(config.schedule, async () => {
      console.log('Running scheduled registry check...');
      await this.runScheduledCheck();
    }, {
      scheduled: true,
      timezone: config.timezone || 'UTC',
    });

    console.log(`Cron job started successfully with tz=${config.timezone || 'UTC'}. Next run scheduled.`);
  }

  static async stopCron(): Promise<void> {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask = null;
      console.log('Cron job stopped');
    }
  }

  static async updateSchedule(newSchedule: string): Promise<void> {
    console.log(`Updating cron schedule to: ${newSchedule}`);
    
    const config = await ConfigService.getCronConfig();
    config.schedule = newSchedule;
    await ConfigService.saveCronConfig(config);
    
    await this.stopCron();
    if (config.enabled) {
      await this.startCron();
    }
  }

  static async updateTimezone(newTimezone: string): Promise<void> {
    console.log(`Updating cron timezone to: ${newTimezone}`);
    const config = await ConfigService.getCronConfig();
    config.timezone = newTimezone;
    await ConfigService.saveCronConfig(config);
    await this.stopCron();
    if (config.enabled) {
      await this.startCron();
    }
  }

  static async toggleCron(enabled: boolean): Promise<void> {
    const config = await ConfigService.getCronConfig();
    config.enabled = enabled;
    await ConfigService.saveCronConfig(config);
    
    if (enabled) {
      await this.startCron();
    } else {
      await this.stopCron();
    }
  }

  static async runScheduledCheck(isManual: boolean = false): Promise<void> {
    try {
      const containers = await ConfigService.getContainers();
      
      if (containers.length === 0) {
        console.log('No images to check');
        return;
      }

      console.log(`Checking ${containers.length} images...`);
      
      const checkResults = await RegistryService.checkAllRegistries(containers);
      const currentStates = await ConfigService.getContainerState();
      const updatedStates = await RegistryService.updateContainerStates(checkResults, currentStates);
      
      // Check for updates and create notifications
      for (let i = 0; i < updatedStates.length; i++) {
        const state = updatedStates[i];
        const previousState = currentStates.find(
          s => s.image === state.image && s.tag === state.tag
        );
        
        // For manual checks, always send notifications regardless of update status
        // For scheduled checks, only send if there's an update and it's not a new container
        console.log(`[CronService] Checking ${state.image}:${state.tag} - isManual: ${isManual}, hasUpdate: ${state.hasUpdate}, hasNewerTag: ${state.hasNewerTag}, isNew: ${state.isNew}`);
        if (isManual || ((state.hasUpdate || state.hasNewerTag) && !state.isNew)) {
          const container = containers.find(
            c => c.imagePath === state.image && c.tag === state.tag
          );
          
          if (container) {
            // Check if this is a new update (different SHA or newer version) to avoid spam
            const isNewShaUpdate = !previousState || !RegistryService.compareShas(previousState.currentSha, state.currentSha);
            const isNewVersionUpdate = !previousState || previousState.hasNewerTag !== state.hasNewerTag;
            const isNewUpdate = isNewShaUpdate || isNewVersionUpdate;
            
            // Create appropriate notification message
            let notificationMessage = `New version available for ${container.name} (tag: ${state.tag})`;
            if (state.hasNewerTag && state.latestAvailableTag) {
              notificationMessage = `Newer version available for ${container.name}: ${state.latestAvailableTag} (currently monitoring ${state.tag})`;
            } else if (isManual && !state.hasUpdate && !state.hasNewerTag) {
              notificationMessage = `Manual check completed for ${container.name} (tag: ${state.tag}) - up to date`;
            }
            
            console.log(`[CronService] About to create notification for ${container.name}`);
            await NotificationService.createUpdateNotification(
              container.name,
              state.image,
              state.tag,
              isNewUpdate,
              notificationMessage
            );
            console.log(`[CronService] Update detected for ${container.name}${isNewUpdate ? ' (new update)' : ' (existing update)'} - SHA: ${state.hasUpdate}, Newer: ${state.hasNewerTag}`);
          }
        } else if (state.isNew) {
          console.log(`Skipping notification for new image: ${state.image}:${state.tag} (isNew=true, establishing baseline)`);
        }
      }
      
      await ConfigService.saveContainerState(updatedStates);
      
      // Send run completion notification (summary)
      await NotificationService.sendRunNotification(
        containers.length,
        updatedStates.filter(state => (state.hasUpdate || state.hasNewerTag)).length,
        0, // errors would be caught in the catch block
        isManual
      );

      // Send individual container status reports
      const containerStatuses = updatedStates.map(state => {
        const container = containers.find(c => c.imagePath === state.image && c.tag === state.tag);
        let status = 'Up to date';
        if (state.hasUpdate || state.hasNewerTag) {
          status = state.hasNewerTag && state.latestAvailableTag ? `Newer version available: ${state.latestAvailableTag}` : 'Update available';
        }
        
        return {
          name: container?.name || state.image,
          image: state.image,
          tag: state.tag,
          status
        };
      });

      await NotificationService.sendIndividualContainerReports(containerStatuses, isManual);
      
      console.log('Scheduled check completed successfully');
      
    } catch (error) {
      console.error('Error during scheduled check:', error);
      await NotificationService.createErrorNotification(
        `Scheduled check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  static async runManualCheck(): Promise<void> {
    console.log('Running manual registry check...');
    console.log('[CronService] Manual check started');
    await this.runScheduledCheck(true); // Pass true to indicate this is a manual check
    console.log('[CronService] Manual check completed');
  }

  static getCurrentTask(): cron.ScheduledTask | null {
    return this.currentTask;
  }

  static isRunning(): boolean {
    return this.currentTask !== null;
  }
}
