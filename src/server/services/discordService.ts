import axios from 'axios';
import { NotificationConfig } from '../types';

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp: string;
  footer?: {
    text: string;
  };
}

export class DiscordService {
  static async sendNotification(
    config: NotificationConfig['discord'],
    title: string,
    message: string,
    type: 'update' | 'error' | 'info' = 'info'
  ): Promise<boolean> {
    if (!config?.enabled || !config.webhooks || config.webhooks.length === 0) {
      console.log('Discord notifications not configured or disabled');
      return false;
    }

    const color = type === 'error' ? 0xff0000 : type === 'update' ? 0x00ff00 : 0x0099ff;
    
    const embed: DiscordEmbed = {
      title: `Registry Radar: ${title}`,
      description: message,
      color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Registry Radar'
      }
    };

    const payload = {
      embeds: [embed]
    };

    let success = true;
    const errors: string[] = [];

    // Send to all configured webhooks
    for (const webhook of config.webhooks) {
      try {
        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.status >= 200 && response.status < 300) {
          console.log(`Discord notification sent successfully to ${webhook.name}`);
        } else {
          errors.push(`${webhook.name}: HTTP ${response.status}`);
          success = false;
        }
      } catch (error) {
        const errorMsg = `${webhook.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`Failed to send Discord notification to ${webhook.name}:`, error);
        success = false;
      }
    }

    if (!success && errors.length > 0) {
      console.error('Discord notification errors:', errors);
    }

    return success;
  }

  static async sendUpdateNotification(
    config: NotificationConfig['discord'],
    containerName: string,
    image: string,
    tag: string
  ): Promise<boolean> {
    const title = '📦 Image Update Available';
    const message = `A new version is available for the following image:`;
    
    const fields = [
      {
        name: 'Container',
        value: containerName,
        inline: true
      },
      {
        name: 'Image',
        value: `\`${image}\``,
        inline: true
      }
    ];
    
    const embed: DiscordEmbed = {
      title: `Registry Radar: ${title}`,
      description: message,
      color: 0x00ff00,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Registry Radar'
      }
    };

    return this.sendEmbedNotification(config, embed);
  }

  static async sendErrorNotification(
    config: NotificationConfig['discord'],
    errorMessage: string,
    container?: string
  ): Promise<boolean> {
    const title = '⚠️ Registry Check Error';
    const message = container 
      ? `An error occurred while checking container: ${container}`
      : `An error occurred during the registry check`;
    
    const embed: DiscordEmbed = {
      title: `Registry Radar: ${title}`,
      description: message,
      color: 0xff0000,
      fields: [
        {
          name: 'Error Details',
          value: `\`\`\`${errorMessage}\`\`\``,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Registry Radar'
      }
    };

    return this.sendEmbedNotification(config, embed);
  }

  static async sendRunNotification(
    config: NotificationConfig['discord'],
    totalContainers: number,
    updatesFound: number,
    errors: number
  ): Promise<boolean> {
    const title = '🔍 Check Complete';
    const message = `Scheduled registry check has completed.`;
    
    const embed: DiscordEmbed = {
      title: `Registry Radar: ${title}`,
      description: message,
      color: 0x0099ff,
      fields: [
        {
          name: 'Total Containers Checked',
          value: totalContainers.toString(),
          inline: true
        },
        {
          name: 'Updates Found',
          value: updatesFound.toString(),
          inline: true
        },
        {
          name: 'Errors',
          value: errors.toString(),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Registry Radar'
      }
    };

    return this.sendEmbedNotification(config, embed);
  }

  static async sendIndividualReports(
    config: NotificationConfig['discord'],
    containers: Array<{name: string, image: string, tag: string, status: string}>
  ): Promise<boolean> {
    const title = '📋 Individual Container Status Report';
    const message = `Status report for all monitored containers:`;
    
    const fields = containers.map(container => ({
      name: container.name,
      value: `**Image:** \`${container.image}:${container.tag}\`\n**Status:** ${container.status}`,
      inline: false
    }));
    
    const embed: DiscordEmbed = {
      title: `Registry Radar: ${title}`,
      description: message,
      color: 0x0099ff,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Registry Radar'
      }
    };

    return this.sendEmbedNotification(config, embed);
  }

  static async testNotification(config: NotificationConfig['discord']): Promise<boolean> {
    const title = '🧪 Test Notification';
    const message = 'This is a test notification from Registry Radar to verify your Discord webhook configuration.';
    
    return this.sendNotification(config, title, message, 'info');
  }

  private static async sendEmbedNotification(
    config: NotificationConfig['discord'],
    embed: DiscordEmbed
  ): Promise<boolean> {
    if (!config?.enabled || !config.webhooks || config.webhooks.length === 0) {
      console.log('Discord notifications not configured or disabled');
      return false;
    }

    const payload = {
      embeds: [embed]
    };

    let success = true;
    const errors: string[] = [];

    // Send to all configured webhooks
    for (const webhook of config.webhooks) {
      try {
        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.status >= 200 && response.status < 300) {
          console.log(`Discord notification sent successfully to ${webhook.name}`);
        } else {
          errors.push(`${webhook.name}: HTTP ${response.status}`);
          success = false;
        }
      } catch (error) {
        const errorMsg = `${webhook.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`Failed to send Discord notification to ${webhook.name}:`, error);
        success = false;
      }
    }

    if (!success && errors.length > 0) {
      console.error('Discord notification errors:', errors);
    }

    return success;
  }
}
