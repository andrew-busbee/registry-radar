import { CronService } from './cronService';

export class InitService {
  static async initialize(): Promise<void> {
    try {
      console.log('Initializing Registry Radar...');
      
      // Start the cron service
      await CronService.startCron();
      
      console.log('Registry Radar initialized successfully');
    } catch (error) {
      console.error('Error during initialization:', error);
      throw error;
    }
  }
}
