import { useState, useEffect } from 'react';
import { Save, Bell, Smartphone, MessageSquare, TestTube, Plus, Trash2, Mail, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { NotificationConfig } from '../types';

interface NotificationSettingsProps {
  config: NotificationConfig;
  onUpdateConfig: (config: Partial<NotificationConfig>) => Promise<void>;
}

export function NotificationSettings({ config, onUpdateConfig }: NotificationSettingsProps) {
  const [localConfig, setLocalConfig] = useState<NotificationConfig>(config);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({
    triggers: true,
    discord: !!config.discord?.enabled,
    pushover: !!config.pushover?.enabled,
    email: !!config.email?.enabled,
    apprise: !!config.apprise?.enabled,
  });

  // Only sync with parent config if we don't have unsaved local changes
  useEffect(() => {
    if (!hasLocalChanges) {
      setLocalConfig(config);
      setExpanded(prev => ({
        ...prev,
        discord: !!config.discord?.enabled,
        pushover: !!config.pushover?.enabled,
        email: !!config.email?.enabled,
        apprise: !!config.apprise?.enabled,
      }));
    }
  }, [config, hasLocalChanges]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onUpdateConfig(localConfig);
      setHasLocalChanges(false); // Clear the flag after successful save
      setSuccess('Notification settings saved successfully');
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to update local config and mark as changed
  const updateLocalConfig = (updater: (prev: NotificationConfig) => NotificationConfig) => {
    setLocalConfig(updater);
    setHasLocalChanges(true);
  };

  // Helper to update trigger config and auto-save
  const updateTriggerConfig = async (updater: (prev: NotificationConfig) => NotificationConfig) => {
    const newConfig = updater(localConfig);
    setLocalConfig(newConfig);
    setHasLocalChanges(false); // Clear the flag since we're auto-saving
    
    // Auto-save trigger changes
    try {
      await onUpdateConfig(newConfig);
      setSuccess('Settings saved automatically');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      setHasLocalChanges(true); // Mark as changed if save failed
    }
  };

  const handleTestPushover = async () => {
    setTesting('pushover');
    try {
      // Save settings first
      await onUpdateConfig(localConfig);
      setHasLocalChanges(false);
      
      const response = await fetch('/api/notification-config/test/pushover', {
        method: 'POST',
      });
      
      if (response.ok) {
        setSuccess('Pushover test notification sent successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test notification');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test notification');
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setTesting(null);
    }
  };

  const handleTestDiscord = async () => {
    setTesting('discord');
    try {
      // Save settings first
      await onUpdateConfig(localConfig);
      setHasLocalChanges(false);
      
      const response = await fetch('/api/notification-config/test/discord', {
        method: 'POST',
      });
      
      if (response.ok) {
        setSuccess('Discord test notification sent successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test notification');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test notification');
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setTesting(null);
    }
  };

  const handleTestEmail = async () => {
    setTesting('email');
    try {
      // Save settings first
      await onUpdateConfig(localConfig);
      setHasLocalChanges(false);
      
      const response = await fetch('/api/notification-config/test/email', {
        method: 'POST',
      });
      
      if (response.ok) {
        setSuccess('Test email sent successfully - check your inbox');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test email');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setTesting(null);
    }
  };

  const handleTestApprise = async () => {
    setTesting('apprise');
    try {
      // Save settings first
      await onUpdateConfig(localConfig);
      setHasLocalChanges(false);
      
      const response = await fetch('/api/notification-config/test/apprise', {
        method: 'POST',
      });
      
      if (response.ok) {
        setSuccess('Apprise test notification sent successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test notification');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test notification');
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setTesting(null);
    }
  };

  const addAppriseChannel = () => {
    updateLocalConfig(prev => ({
      ...prev,
      apprise: {
        ...prev.apprise,
        enabled: prev.apprise?.enabled || false,
        channels: [
          ...(prev.apprise?.channels || []),
          { name: '', url: '', enabled: true }
        ]
      }
    }));
  };

  const removeAppriseChannel = (index: number) => {
    updateLocalConfig(prev => ({
      ...prev,
      apprise: {
        ...prev.apprise!,
        channels: prev.apprise!.channels.filter((_, i) => i !== index)
      }
    }));
  };

  const updateAppriseChannel = (index: number, field: 'name' | 'url' | 'enabled', value: string | boolean) => {
    updateLocalConfig(prev => ({
      ...prev,
      apprise: {
        ...prev.apprise!,
        channels: prev.apprise!.channels.map((channel, i) => 
          i === index ? { ...channel, [field]: value } : channel
        )
      }
    }));
  };

  const addDiscordWebhook = () => {
    updateLocalConfig(prev => ({
      ...prev,
      discord: {
        ...prev.discord,
        enabled: true,
        webhooks: [
          ...(prev.discord?.webhooks || []),
          { url: '', name: '' }
        ]
      }
    }));
  };

  const removeDiscordWebhook = (index: number) => {
    updateLocalConfig(prev => ({
      ...prev,
      discord: {
        ...prev.discord,
        webhooks: prev.discord?.webhooks?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const updateDiscordWebhook = (index: number, field: 'url' | 'name', value: string) => {
    updateLocalConfig(prev => ({
      ...prev,
      discord: {
        ...prev.discord,
        webhooks: prev.discord?.webhooks?.map((webhook, i) => 
          i === index ? { ...webhook, [field]: value } : webhook
        ) || []
      }
    }));
  };

  const SectionHeader = ({
    icon: Icon,
    title,
    sectionKey,
    toggle,
  }: { icon: any; title: string; sectionKey: string; toggle?: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => setExpanded(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
      className="w-full flex items-center justify-between text-left"
      aria-expanded={expanded[sectionKey]}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" />
        <span className="text-lg font-semibold text-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        {toggle}
        {expanded[sectionKey] ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </button>
  );

  const Toggle = ({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (next: boolean) => void; ariaLabel?: string }) => (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={ariaLabel || 'Toggle'}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors border ${
        checked ? 'bg-primary border-primary' : 'bg-gray-300 border-gray-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Notification Settings</h2>
          <p className="text-muted-foreground text-sm">
            Configure external notifications for container updates and system events
          </p>
        </div>
        <div className="hidden sm:flex">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global feedback */}
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

      {/* Trigger Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <SectionHeader icon={Bell} title="Notification Triggers" sectionKey="triggers" />
        {expanded.triggers && (
        <div className="mt-3 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <Toggle
                checked={localConfig.triggers.sendSummaryOnScheduledRun}
                onChange={(next) => updateTriggerConfig(prev => ({
                  ...prev,
                  triggers: { ...prev.triggers, sendSummaryOnScheduledRun: next }
                }))}
                ariaLabel="Send summary notifications on every scheduled run"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="font-medium text-foreground">Send summary notifications on every scheduled run</label>
              <p className="text-sm text-muted-foreground mt-1">Send a summary notification after each scheduled check showing total number of images checked, updates found, and errors</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <Toggle
                checked={localConfig.triggers.sendIndividualReportsOnScheduledRun}
                onChange={(next) => updateTriggerConfig(prev => ({
                  ...prev,
                  triggers: { ...prev.triggers, sendIndividualReportsOnScheduledRun: next }
                }))}
                ariaLabel="Send individual reports on every scheduled run"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="font-medium text-foreground">Send individual reports on every scheduled run</label>
              <p className="text-sm text-muted-foreground mt-1">Send detailed status report for each image after every scheduled check</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <Toggle
                checked={localConfig.triggers.sendReportsWhenUpdatesFound}
                onChange={(next) => updateTriggerConfig(prev => ({
                  ...prev,
                  triggers: { ...prev.triggers, sendReportsWhenUpdatesFound: next }
                }))}
                ariaLabel="Send reports when updates found"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="font-medium text-foreground">Send reports when updates found</label>
              <p className="text-sm text-muted-foreground mt-1">Send notification when new versions are detected with a custom message for each updated image</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <Toggle
                checked={localConfig.triggers.sendReportsOnErrors}
                onChange={(next) => updateTriggerConfig(prev => ({
                  ...prev,
                  triggers: { ...prev.triggers, sendReportsOnErrors: next }
                }))}
                ariaLabel="Send reports on errors"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="font-medium text-foreground">Send reports on errors</label>
              <p className="text-sm text-muted-foreground mt-1">Send notification when registry checks fail</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <Toggle
                checked={localConfig.triggers.sendReportsOnManualCheck}
                onChange={(next) => updateTriggerConfig(prev => ({
                  ...prev,
                  triggers: { ...prev.triggers, sendReportsOnManualCheck: next }
                }))}
                ariaLabel="Send the above reports on manual checks as well"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="font-medium text-foreground">Send the above reports on manual checks as well</label>
              <p className="text-sm text-muted-foreground mt-1">When enabled, manual checks will send the same notifications as scheduled runs based on the settings above</p>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Apprise Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <SectionHeader
          icon={Zap}
          title="Apprise Notifications"
          sectionKey="apprise"
          toggle={
            <div className="inline-flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted-foreground">Enable</span>
              <Toggle
                checked={localConfig.apprise?.enabled || false}
                onChange={(next) => {
                  updateLocalConfig(prev => ({
                    ...prev,
                    apprise: {
                      ...prev.apprise,
                      enabled: next,
                      channels: next
                        ? (prev.apprise?.channels || [])
                        : (prev.apprise?.channels || [])
                    }
                  }));
                  setExpanded(prev => ({ ...prev, apprise: next }));
                }}
                ariaLabel="Enable Apprise"
              />
            </div>
          }
        />
        {!localConfig.apprise?.enabled && !expanded.apprise && (
          <p className="mt-2 text-sm text-muted-foreground">Enable Apprise to configure notification channels</p>
        )}

        {expanded.apprise && (
          <div className="mt-4 space-y-4">
            {localConfig.apprise?.enabled ? (
              <>
                <div>
                  <h4 className="font-medium text-foreground mb-3">Notification Channels</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure Apprise notification channels. Each channel can send to different services like Discord, Slack, Email, etc.
                  </p>
                  <button
                    onClick={addAppriseChannel}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Channel</span>
                  </button>
                </div>

                {localConfig.apprise?.channels?.map((channel, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-foreground">Channel {index + 1}</h5>
                      <button
                        onClick={() => removeAppriseChannel(index)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Channel Name</label>
                        <input
                          type="text"
                          value={channel.name}
                          onChange={(e) => updateAppriseChannel(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                          placeholder="e.g., Discord Alerts"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={channel.enabled}
                            onChange={(e) => updateAppriseChannel(index, 'enabled', e.target.checked)}
                            className="rounded border-input"
                          />
                          <span className="text-sm text-foreground">Enabled</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Apprise URL</label>
                      <input
                        type="text"
                        value={channel.url}
                        onChange={(e) => updateAppriseChannel(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="e.g., discord://webhook_id/webhook_token"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported formats: discord://, slack://, mailto://, pushover://, etc. 
                        <a href="https://github.com/caronc/apprise#supported-notifications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                          See all supported services
                        </a>
                      </p>
                    </div>
                  </div>
                ))}

                {(!localConfig.apprise?.channels || localConfig.apprise.channels.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No channels configured. Click "Add Channel" to add your first Apprise channel.
                  </p>
                )}

                <div>
                  <button
                    onClick={handleTestApprise}
                    disabled={testing === 'apprise' || !localConfig.apprise?.channels?.some(c => c.url && c.enabled)}
                    className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                  >
                    <TestTube className="w-4 h-4" />
                    <span>{testing === 'apprise' ? 'Testing...' : 'Test Apprise'}</span>
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Enable Apprise to configure notification channels</p>
            )}
          </div>
        )}
      </div>

      {/* Discord Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <SectionHeader
          icon={MessageSquare}
          title="Discord Notifications"
          sectionKey="discord"
          toggle={
            <div className="inline-flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted-foreground">Enable</span>
              <Toggle
                checked={localConfig.discord?.enabled || false}
                onChange={(next) => {
                  updateLocalConfig(prev => ({
                    ...prev,
                    discord: {
                      ...prev.discord,
                      enabled: next,
                      webhooks: next
                        ? ((prev.discord?.webhooks && prev.discord.webhooks.length > 0)
                            ? prev.discord.webhooks
                            : [{ url: '', name: '' }])
                        : (prev.discord?.webhooks || [])
                    }
                  }));
                  setExpanded(prev => ({ ...prev, discord: next }));
                }}
                ariaLabel="Enable Discord"
              />
            </div>
          }
        />
        {!localConfig.discord?.enabled && !expanded.discord && (
          <p className="mt-2 text-sm text-muted-foreground">Enable Discord to configure webhooks</p>
        )}

        {expanded.discord && (
        <div className="mt-3 space-y-3">
          {localConfig.discord?.enabled ? (
            <>
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Webhooks</h4>
                <button
                  onClick={addDiscordWebhook}
                  className="flex items-center space-x-1 px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Webhook</span>
                </button>
              </div>
              {localConfig.discord?.webhooks?.map((webhook, index) => (
                <div key={index} className="p-3 border border-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-foreground">Webhook {index + 1}</h5>
                    <button
                      onClick={() => removeDiscordWebhook(index)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                      <input
                        type="text"
                        value={webhook.name}
                        onChange={(e) => updateDiscordWebhook(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="Webhook name (e.g., Production Alerts)"
                      />
                    </div>
                    <div className="md:col-span-1 col-span-1">
                      <label className="block text-sm font-medium text-foreground mb-1">Webhook URL</label>
                      <input
                        type="url"
                        value={webhook.url}
                        onChange={(e) => updateDiscordWebhook(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="https://discord.com/api/webhooks/..."
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!localConfig.discord?.webhooks || localConfig.discord.webhooks.length === 0) && (
                <p className="text-muted-foreground text-center py-4">
                  No webhooks configured. Click "Add Webhook" to add your first Discord webhook.
                </p>
              )}
              <div>
                <button
                  onClick={handleTestDiscord}
                  disabled={testing === 'discord' || !localConfig.discord?.webhooks?.some(w => w.url)}
                  className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                >
                  <TestTube className="w-4 h-4" />
                  <span>{testing === 'discord' ? 'Testing...' : 'Test Discord'}</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Enable Discord to configure webhooks</p>
          )}
        </div>
        )}
      </div>

      {/* Pushover Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <SectionHeader
          icon={Smartphone}
          title="Pushover Notifications"
          sectionKey="pushover"
          toggle={
            <div className="inline-flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted-foreground">Enable</span>
              <Toggle
                checked={localConfig.pushover?.enabled || false}
                onChange={(next) => {
                  updateLocalConfig(prev => ({
                    ...prev,
                    pushover: {
                      ...prev.pushover,
                      enabled: next,
                      apiKey: prev.pushover?.apiKey || '',
                      userKey: prev.pushover?.userKey || '',
                      devices: prev.pushover?.devices || []
                    }
                  }));
                  setExpanded(prev => ({ ...prev, pushover: next }));
                }}
                ariaLabel="Enable Pushover"
              />
            </div>
          }
        />
        {!localConfig.pushover?.enabled && !expanded.pushover && (
          <p className="mt-2 text-sm text-muted-foreground">Enable Pushover to configure API and User keys</p>
        )}

        {expanded.pushover && (
        <div className="mt-3 space-y-3">
          {localConfig.pushover?.enabled ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">API Key</label>
                  <input
                    type="text"
                    value={localConfig.pushover?.apiKey || ''}
                    onChange={(e) => updateLocalConfig(prev => ({
                      ...prev,
                      pushover: { ...prev.pushover!, apiKey: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    placeholder="Your Pushover application API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">User Key</label>
                  <input
                    type="text"
                    value={localConfig.pushover?.userKey || ''}
                    onChange={(e) => updateLocalConfig(prev => ({
                      ...prev,
                      pushover: { ...prev.pushover!, userKey: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    placeholder="Your Pushover user key"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Devices (Optional)</label>
                <input
                  type="text"
                  value={localConfig.pushover?.devices?.join(', ') || ''}
                  onChange={(e) => updateLocalConfig(prev => ({
                    ...prev,
                    pushover: { 
                      ...prev.pushover!, 
                      devices: e.target.value.split(',').map(d => d.trim()).filter(d => d)
                    }
                  }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  placeholder="device1, device2 (leave empty for all devices)"
                />
              </div>
              <div>
                <button
                  onClick={handleTestPushover}
                  disabled={testing === 'pushover' || !localConfig.pushover?.apiKey || !localConfig.pushover?.userKey}
                  className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                >
                  <TestTube className="w-4 h-4" />
                  <span>{testing === 'pushover' ? 'Testing...' : 'Test Pushover'}</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Enable Pushover to configure API and User keys</p>
          )}
        </div>
        )}
      </div>

      {/* Email Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <SectionHeader
          icon={Mail}
          title="Email Notifications"
          sectionKey="email"
          toggle={
            <div className="inline-flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted-foreground">Enable</span>
              <Toggle
                checked={localConfig.email?.enabled || false}
                onChange={(next) => {
                  updateLocalConfig(prev => ({
                    ...prev,
                    email: {
                      ...prev.email,
                      enabled: next,
                      host: prev.email?.host || '',
                      port: prev.email?.port || 587,
                      username: prev.email?.username || '',
                      password: prev.email?.password || '',
                      toEmails: prev.email?.toEmails || [],
                      fromEmail: prev.email?.fromEmail || '',
                      fromName: prev.email?.fromName || 'Registry Radar'
                    }
                  }));
                  setExpanded(prev => ({ ...prev, email: next }));
                }}
                ariaLabel="Enable Email"
              />
            </div>
          }
        />
        {!localConfig.email?.enabled && !expanded.email && (
          <p className="mt-2 text-sm text-muted-foreground">Enable Email to configure SMTP settings</p>
        )}

        {expanded.email && (
        <div className="mt-3 space-y-3">
          {localConfig.email?.enabled ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">SMTP Host *</label>
                  <input
                    type="text"
                    value={localConfig.email?.host || ''}
                    onChange={(e) => updateLocalConfig(prev => ({
                      ...prev,
                      email: { ...prev.email!, host: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">SMTP Port *</label>
                  <select
                    value={localConfig.email?.port || 587}
                    onChange={(e) => updateLocalConfig(prev => ({
                      ...prev,
                      email: { ...prev.email!, port: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  >
                    <option value="587">587 (STARTTLS - Recommended)</option>
                    <option value="465">465 (TLS/SSL)</option>
                    <option value="25">25 (Unencrypted - Not recommended)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email/Username *</label>
                  <input
                    type="text"
                    value={localConfig.email?.username || ''}
                    onChange={(e) => updateLocalConfig(prev => ({
                      ...prev,
                      email: { ...prev.email!, username: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password *</label>
                  <input
                    type="password"
                    value={localConfig.email?.password || ''}
                    onChange={(e) => updateLocalConfig(prev => ({
                      ...prev,
                      email: { ...prev.email!, password: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    placeholder="App password (for Gmail)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">From Email (Optional)</label>
                  <input
                    type="email"
                    value={localConfig.email?.fromEmail || ''}
                    onChange={(e) => updateLocalConfig(prev => ({
                      ...prev,
                      email: { ...prev.email!, fromEmail: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    placeholder="Leave empty to use username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">From Name (Optional)</label>
                  <input
                    type="text"
                    value={localConfig.email?.fromName || ''}
                    onChange={(e) => updateLocalConfig(prev => ({
                      ...prev,
                      email: { ...prev.email!, fromName: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    placeholder="Registry Radar"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">To Emails * (comma-separated)</label>
                <input
                  type="text"
                  value={localConfig.email?.toEmails?.join(', ') || ''}
                  onChange={(e) => updateLocalConfig(prev => ({
                    ...prev,
                    email: { 
                      ...prev.email!, 
                      toEmails: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                    }
                  }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  placeholder="admin@example.com, notifications@example.com"
                />
                <p className="text-xs text-muted-foreground mt-1">Multiple emails can be separated by commas</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>📌 Gmail Users:</strong> Use an App Password instead of your regular password. 
                  <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="underline ml-1">Learn how</a>
                </p>
              </div>
              <div>
                <button
                  onClick={handleTestEmail}
                  disabled={testing === 'email' || !localConfig.email?.host || !localConfig.email?.username || !localConfig.email?.password || !localConfig.email?.toEmails?.length}
                  className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                >
                  <TestTube className="w-4 h-4" />
                  <span>{testing === 'email' ? 'Testing...' : 'Test Email'}</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Enable Email to configure SMTP settings</p>
          )}
        </div>
        )}
      </div>


      {/* Sticky action bar for smaller screens */}
      <div className="sm:hidden sticky bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border p-3 mt-2">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
