import { useState, useEffect } from 'react';
import { Save, Clock, ToggleLeft, ToggleRight, Settings as SettingsIcon, Bell } from 'lucide-react';
import { CronConfig, NotificationConfig } from '../types';
import { NotificationSettings } from '../components/NotificationSettings';
import { ThemeToggle } from '../components/ThemeToggle';

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
  const [timezone, setTimezone] = useState(cronConfig.timezone || 'UTC');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Build a comprehensive timezone list using IANA zones when available,
  // with a reasonable fallback set if not supported by the browser.
  const fallbackZones = [
    'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'America/Phoenix','America/Anchorage','Pacific/Honolulu','Europe/London','Europe/Paris',
    'Europe/Berlin','Europe/Madrid','Europe/Moscow','Africa/Johannesburg','Asia/Kolkata',
    'Asia/Shanghai','Asia/Tokyo','Asia/Seoul','Asia/Dubai','Australia/Sydney','Australia/Melbourne',
    'Pacific/Auckland','America/Sao_Paulo','America/Mexico_City'
  ];
  const allTimezones: string[] = (() => {
    try {
      const z: string[] = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : [];
      if (Array.isArray(z) && z.length > 0) return z;
    } catch {}
    return fallbackZones;
  })();
  const [tzQuery, setTzQuery] = useState('');
  const filteredTimezones = allTimezones.filter(z => z.toLowerCase().includes(tzQuery.toLowerCase())).slice(0, 200);

  // Sync local state with prop changes
  useEffect(() => {
    setSchedule(cronConfig.schedule);
    setEnabled(cronConfig.enabled);
    setTimezone(cronConfig.timezone || 'UTC');
  }, [cronConfig.schedule, cronConfig.enabled, cronConfig.timezone]);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onUpdateCronConfig({ schedule, enabled, timezone });
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

  const handleToggleEnabled = async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    
    // Auto-save when toggling
    try {
      if (newEnabled) {
        // When enabling, save both enabled state and current schedule
        await onUpdateCronConfig({ schedule, enabled: newEnabled, timezone });
      } else {
        // When disabling, only save the enabled state
        await onUpdateCronConfig({ enabled: newEnabled });
      }
    } catch (err) {
      // Revert on error
      setEnabled(enabled);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
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

  const tabs = [
    {
      id: 'general' as const,
      label: 'Schedule Settings',
      icon: SettingsIcon,
      description: 'Cron schedule and basic settings'
    },
    {
      id: 'notifications' as const,
      label: 'Notification Settings',
      icon: Bell,
      description: 'Apprise and notification triggers'
    }
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header - Above horizontal line */}
      <div className="fixed top-0 left-64 right-0 z-20 bg-background border-b border-border pb-4 px-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your registry monitoring schedule and notification preferences
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Scrollable Content - Below horizontal line */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl space-y-4 p-6 pt-20">
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
            <span>Image Update Scheduler</span>
          </h2>

          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={handleToggleEnabled}
                  aria-pressed={enabled}
                  aria-label="Enable Automatic Checks"
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors border ${
                    enabled ? 'bg-primary border-primary' : 'bg-gray-300 border-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <h3 className="font-medium text-foreground">Enable Automatic Checks</h3>
                <div className="flex items-center gap-2 ml-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-muted-foreground">{enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically check for container updates based on a set schedule (Once a day is recommended)
                {enabled && (
                  <>
                    <br />
                    <span className="text-red-600">
                      Note: Be aware that running the checks too often can cause rate limiting for Docker Hub hosted images. You can increase the rate limit from 100 to 200 pulls/6hr (or unlimited with Pro account) by adding your Docker credentials to the Docker environment variables DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Schedule Configuration - Only show when enabled */}
            {enabled && (
            <div className="space-y-3">
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Cron Expression
                    </label>
                    <input
                      type="text"
                      value={schedule}
                      onChange={(e) => {
                      // Allow only safe cron characters and compress whitespace
                      const raw = e.target.value;
                      const sanitized = raw
                        .replace(/[^*\/\-,0-9\s]/g, '') // keep digits, space, comma, dash, slash, asterisk
                        .replace(/\s+/g, ' ') // normalize spaces
                        .trim()
                        .slice(0, 32); // hard cap length
                      setSchedule(sanitized);
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={32}
                      className="px-3 py-2 border border-input rounded-md bg-background text-foreground font-mono w-full"
                      placeholder="0 9 * * *"
                      aria-label="Cron Expression"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-foreground mb-2">Search and Change Timezone</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={timezone}
                        onChange={(e) => { setTimezone(e.target.value); setTzQuery(e.target.value); }}
                        onFocus={() => setTzQuery(timezone)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="Search timezone (e.g., America/Chicago)"
                        aria-label="Timezone"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {tzQuery !== '' && (
                        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto border border-input rounded-md bg-background shadow">
                          {filteredTimezones.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                          ) : (
                            filteredTimezones.map((tz) => (
                              <button
                                key={tz}
                                type="button"
                                onClick={() => { setTimezone(tz); setTzQuery(''); }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${tz === timezone ? 'bg-accent' : ''}`}
                              >
                                {tz}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Format: minute hour day month weekday (e.g., "0 9 * * *" for daily at 9 AM in {timezone})
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

            </div>
            )}

            {/* Status removed and inlined near toggle */}

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

            {/* Save Button - Only show when enabled */}
            {enabled && (
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
            )}
          </div>

          {/* Information Section - Only show when enabled */}
          {enabled && (
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
          )}
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
      </div>
    </div>
  );
}
