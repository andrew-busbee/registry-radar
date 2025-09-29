import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { ContainerRegistry, ContainerState, CronConfig, NotificationConfig } from '../types';

const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONTAINERS_FILE = path.join(CONFIG_DIR, 'containers.yml');
const STATE_FILE = path.join(CONFIG_DIR, 'state.json');
const CRON_FILE = path.join(CONFIG_DIR, 'cron.yml');
const NOTIFICATIONS_FILE = path.join(CONFIG_DIR, 'notifications.yml');

export class ConfigService {
  private static async ensureConfigDir(): Promise<void> {
    try {
      await fs.access(CONFIG_DIR);
    } catch {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    }
  }

  static async getContainers(): Promise<ContainerRegistry[]> {
    await this.ensureConfigDir();
    try {
      const content = await fs.readFile(CONTAINERS_FILE, 'utf-8');
      const parsed = yaml.parse(content);
      return parsed.containers || [];
    } catch (error) {
      // Return empty array if file doesn't exist
      return [];
    }
  }

  static async saveContainers(containers: ContainerRegistry[]): Promise<void> {
    await this.ensureConfigDir();
    const yamlContent = yaml.stringify({ containers });
    await fs.writeFile(CONTAINERS_FILE, yamlContent, 'utf-8');
  }

  static async getContainerState(): Promise<ContainerState[]> {
    await this.ensureConfigDir();
    try {
      const content = await fs.readFile(STATE_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }

  static async saveContainerState(state: ContainerState[]): Promise<void> {
    await this.ensureConfigDir();
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }

  static async getCronConfig(): Promise<CronConfig> {
    await this.ensureConfigDir();
    try {
      const content = await fs.readFile(CRON_FILE, 'utf-8');
      console.log('Reading cron config from file:', content);
      const parsed = yaml.parse(content);
      const config = parsed.cron || { schedule: '0 9 * * *', enabled: true };
      console.log('Parsed cron config:', config);
      return config;
    } catch (error) {
      console.log('Error reading cron config file, using default:', error);
      return { schedule: '0 9 * * *', enabled: true };
    }
  }

  static async saveCronConfig(config: CronConfig): Promise<void> {
    await this.ensureConfigDir();
    const yamlContent = yaml.stringify({ cron: config });
    console.log('Saving cron config to file:', yamlContent);
    await fs.writeFile(CRON_FILE, yamlContent, 'utf-8');
    console.log('Cron config saved to:', CRON_FILE);
  }

  static async getNotificationConfig(): Promise<NotificationConfig> {
    await this.ensureConfigDir();
    try {
      const content = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
      const parsed = yaml.parse(content);
      return parsed.notifications || {
        triggers: {
          onEveryRun: false,
          onNewUpdates: true,
          onErrors: true,
          onManualCheck: false,
        }
      };
    } catch (error) {
      return {
        triggers: {
          onEveryRun: false,
          onNewUpdates: true,
          onErrors: true,
          onManualCheck: false,
        }
      };
    }
  }

  static async saveNotificationConfig(config: NotificationConfig): Promise<void> {
    await this.ensureConfigDir();
    const yamlContent = yaml.stringify({ notifications: config });
    await fs.writeFile(NOTIFICATIONS_FILE, yamlContent, 'utf-8');
  }
}
