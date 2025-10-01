import { useState, useEffect } from 'react';
import { Save, Clock, ToggleLeft, ToggleRight, Settings as SettingsIcon, Bell } from 'lucide-react';
import { CronConfig, NotificationConfig } from '../types';
import { NotificationSettings } from '../components/NotificationSettings';

interface SettingsProps {
  cronConfig: CronConfig;
  onUpdateCronConfig: (config: Partial<CronConfig>) => Promise<void>;
  notificationConfig: NotificationConfig;
  onUpdateNotificationConfig: (config: Partial<NotificationConfig>) => Promise<void>;
  initialTab?: 'general' | 'notifications';
}

export function Settings({ cronConfig, onUpdateCronConfig, notificationConfig, onUpdateNotificationConfig, initialTab = 'general' }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>(initialTab);
  const [schedule, setSchedule] = useState(cronConfig.schedule);
  const [enabled, setEnabled] = useState(cronConfig.enabled);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync local state with prop changes
  useEffect(() => {
    setSchedule(cronConfig.schedule);
    setEnabled(cronConfig.enabled);
  }, [cronConfig.schedule, cronConfig.enabled]);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onUpdateCronConfig({ schedule, enabled });
      setSuccess('Settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const commonSchedules = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Every 12 hours', value: '0 */12 * * *' },
    { label: 'Daily at 9 AM', value: '0 9 * * *' },
    { label: 'Daily at 6 PM', value: '0 18 * * *' },
    { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
    { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
  ];

  const formatCronExpression = (cron: string) => {
    try {
      // Handle empty or invalid cron expressions
      if (!cron || typeof cron !== 'string') {
        return 'Invalid cron expression';
      }

      const fields = cron.trim().split(/\s+/);
      
      // Check if we have exactly 5 fields
      if (fields.length !== 5) {
        return `Invalid format: Expected 5 fields, got ${fields.length}`;
      }

      const [minute, hour, day, month, weekday] = fields;
      
      const formatField = (field: string, labels: string[]) => {
        if (!field) return 'empty';
        if (field === '*') return 'every';
        if (field.includes('/')) {
          const parts = field.split('/');
          if (parts.length !== 2) return field;
          const [, interval] = parts;
          return `every ${interval}`;
        }
        if (field.includes(',')) {
          return field.split(',').map(f => {
            const num = parseInt(f);
            return isNaN(num) ? f : (labels[num - 1] || f);
          }).join(', ');
        }
        if (field.includes('-')) {
          const parts = field.split('-');
          if (parts.length !== 2) return field;
          const [start, end] = parts;
          const startNum = parseInt(start);
          const endNum = parseInt(end);
          return `${isNaN(startNum) ? start : (labels[startNum - 1] || start)} to ${isNaN(endNum) ? end : (labels[endNum - 1] || end)}`;
        }
        const num = parseInt(field);
        return isNaN(num) ? field : (labels[num - 1] || field);
      };

      const minutes = formatField(minute, Array.from({ length: 60 }, (_, i) => i.toString()));
      const hours = formatField(hour, Array.from({ length: 24 }, (_, i) => i.toString()));
      const days = formatField(day, Array.from({ length: 31 }, (_, i) => (i + 1).toString()));
      const months = formatField(month, [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]);
      const weekdays = formatField(weekday, [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
      ]);

      return `At minute ${minute}, hour ${hour}, day ${day}, month ${month}, weekday ${weekday}`;
    } catch (error) {
      console.error('Error formatting cron expression:', error);
      return 'Error formatting cron expression';
    }
  };

  const tabs = [
    {
      id: 'general' as const,
      label: 'General',
      icon: SettingsIcon,
      description: 'Cron schedule and basic settings'
    },
    {
      id: 'notifications' as const,
      label: 'Notifications',
      icon: Bell,
      description: 'Discord, Pushover, and notification triggers'
    }
  ];

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure your registry monitoring schedule and notification preferences
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Cron Schedule Configuration</span>
          </h2>

          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Enable Automatic Checks</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically check for container updates based on the schedule below.  Once a day is recommended.
                  {" "}
                  <span className="text-red-600">
                    Note: Be aware that running the checks too often can cause rate limiting for docker hub hosted images. You can increase the rate limit from 100 to 200 pulls/6hr (or unlimited with Pro account) by adding your docker credentials to the docker environment variables DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD
                  </span>
                </p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className="flex items-center space-x-2"
              >
                {enabled ? (
                  <ToggleRight className="w-8 h-8 text-primary" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Schedule Configuration */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Cron Expression
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground font-mono"
                    placeholder="0 9 * * *"
                  />
                  <div className="px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm">
                    5 fields
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Format: minute hour day month weekday (e.g., "0 9 * * *" for daily at 9 AM)
                </p>
              </div>

              {/* Common Schedules */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quick Select
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {commonSchedules.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setSchedule(value)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        schedule === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:bg-accent'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Preview */}
              <div className="p-3 bg-muted rounded-md">
                <h4 className="text-sm font-medium text-foreground mb-1">Schedule Preview</h4>
                <p className="text-sm text-muted-foreground font-mono">{schedule}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCronExpression(schedule)}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="p-3 bg-muted rounded-md">
              <h4 className="text-sm font-medium text-foreground mb-2">Current Status</h4>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    cronConfig.enabled ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-muted-foreground">
                    {cronConfig.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>

          {/* Information Section */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold text-foreground mb-3">About Cron Expressions</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Cron expressions are used to schedule tasks. They consist of 5 fields:
              </p>
              <div className="bg-muted p-2 rounded-md font-mono text-xs">
                <div>minute (0-59) hour (0-23) day (1-31) month (1-12) weekday (0-7)</div>
              </div>
              <p>
                Special characters:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-muted px-1 rounded">*</code> - any value</li>
                <li><code className="bg-muted px-1 rounded">,</code> - list of values (e.g., 1,3,5)</li>
                <li><code className="bg-muted px-1 rounded">-</code> - range of values (e.g., 1-5)</li>
                <li><code className="bg-muted px-1 rounded">/</code> - step values (e.g., */2 for every 2nd)</li>
              </ul>
            </div>
          </div>
        </div>
        </div>

      )}

      {activeTab === 'notifications' && (
        <NotificationSettings
          config={notificationConfig}
          onUpdateConfig={onUpdateNotificationConfig}
        />
      )}
    </div>
  );
}
