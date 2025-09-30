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

    console.log(`Starting cron job with schedule: ${config.schedule}`);
    
    this.currentTask = cron.schedule(config.schedule, async () => {
      console.log('Running scheduled registry check...');
      await this.runScheduledCheck();
    }, {
      scheduled: true,
      timezone: 'UTC',
    });

    console.log(`Cron job started successfully. Next run scheduled.`);
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

  static async runScheduledCheck(): Promise<void> {
    try {
      const containers = await ConfigService.getContainers();
      
      if (containers.length === 0) {
        console.log('No containers to check');
        return;
      }

      console.log(`Checking ${containers.length} containers...`);
      
      const checkResults = await RegistryService.checkAllRegistries(containers);
      const currentStates = await ConfigService.getContainerState();
      const updatedStates = await RegistryService.updateContainerStates(checkResults, currentStates);
      
      // Check for updates and create notifications
      for (let i = 0; i < updatedStates.length; i++) {
        const state = updatedStates[i];
        const previousState = currentStates.find(
          s => s.image === state.image && s.tag === state.tag
        );
        
        if (state.hasUpdate) {
          const container = containers.find(
            c => c.imagePath === state.image && c.tag === state.tag
          );
          
          if (container) {
            // Check if this is a new update (different SHA) to avoid spam
            const isNewUpdate = !previousState || previousState.currentSha !== state.currentSha;
            
            await NotificationService.createUpdateNotification(
              container.name,
              `${state.image}:${state.tag}`,
              state.tag,
              isNewUpdate
            );
            console.log(`Update detected for ${container.name}${isNewUpdate ? ' (new update)' : ' (existing update)'}`);
          }
        }
      }
      
      await ConfigService.saveContainerState(updatedStates);
      
      // Send run completion notification
      await NotificationService.sendRunNotification(
        containers.length,
        updatedStates.filter(state => state.hasUpdate).length,
        0 // errors would be caught in the catch block
      );
      
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
    await this.runScheduledCheck();
  }

  static getCurrentTask(): cron.ScheduledTask | null {
    return this.currentTask;
  }

  static isRunning(): boolean {
    return this.currentTask !== null;
  }
}
