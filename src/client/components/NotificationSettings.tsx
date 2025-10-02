import { useState, useEffect } from 'react';
import { Save, Bell, TestTube, Plus, Trash2, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { NotificationConfig } from '../types';

interface NotificationSettingsProps {
  config: NotificationConfig;
  onUpdateConfig: (config: Partial<NotificationConfig>) => Promise<void>;
}

export function NotificationSettings({ config, onUpdateConfig }: NotificationSettingsProps) {
  // Common function to get trigger value with fallback
  const getTriggerValue = (triggerName: keyof typeof defaultTriggers, defaultValue: boolean) => {
    return localConfig.triggers?.[triggerName] ?? defaultValue;
  };

  const defaultTriggers = {
    sendSummaryOnScheduledRun: true,
    sendIndividualReportsOnScheduledRun: false,
    sendReportsWhenUpdatesFound: true,
    sendReportsOnErrors: true,
  };

  const [localConfig, setLocalConfig] = useState<NotificationConfig>(() => {
    return {
      ...config,
      triggers: {
        ...defaultTriggers,
        ...(config.triggers || {})
      }
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({
    triggers: true,
    apprise: !!config.apprise?.enabled,
  });

  // Only sync with parent config if we don't have unsaved local changes
  useEffect(() => {
    if (!hasLocalChanges) {
      const defaultTriggers = {
        sendSummaryOnScheduledRun: true,
        sendIndividualReportsOnScheduledRun: false,
        sendReportsWhenUpdatesFound: true,
        sendReportsOnErrors: true,
      };
      
      setLocalConfig({
        ...config,
        triggers: {
          ...defaultTriggers,
          ...(config.triggers || {})
        }
      });
      
      setExpanded(prev => ({
        ...prev,
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
        ...prev.apprise,
        channels: prev.apprise?.channels?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const updateAppriseChannel = (index: number, field: 'name' | 'url' | 'enabled', value: string | boolean) => {
    updateLocalConfig(prev => ({
      ...prev,
      apprise: {
        ...prev.apprise,
        channels: prev.apprise?.channels?.map((channel, i) => 
          i === index ? { ...channel, [field]: value } : channel
        ) || []
      }
    }));
  };

  // Toggle component
  const Toggle = ({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (checked: boolean) => void; ariaLabel?: string }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );

  // Section header component
  const SectionHeader = ({ 
    icon: Icon, 
    title, 
    sectionKey, 
    toggle 
  }: { 
    icon: any; 
    title: string; 
    sectionKey: string; 
    toggle?: React.ReactNode; 
  }) => (
    <div 
      className="flex items-center justify-between cursor-pointer"
      onClick={() => setExpanded(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
    >
      <div className="flex items-center space-x-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center space-x-2">
        {toggle}
        {expanded[sectionKey] ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notification Settings</h2>
        </div>
        {hasLocalChanges && (
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Saving...' : 'Save'}</span>
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-2 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Notification Triggers */}
      <div className="bg-card border border-border rounded-lg p-4">
        <SectionHeader
          icon={Zap}
          title="Notification Triggers"
          sectionKey="triggers"
        />
        {expanded.triggers && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Send summary on scheduled runs</label>
                  <p className="text-xs text-muted-foreground">Send a summary notification when scheduled checks complete</p>
                </div>
                <Toggle
                  checked={getTriggerValue('sendSummaryOnScheduledRun', true)}
                  onChange={(checked) => updateTriggerConfig(prev => ({
                    ...prev,
                    triggers: { ...prev.triggers, sendSummaryOnScheduledRun: checked }
                  }))}
                  ariaLabel="Send summary on scheduled runs"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Send individual reports on scheduled runs</label>
                  <p className="text-xs text-muted-foreground">Send detailed reports for each container during scheduled runs</p>
                </div>
                <Toggle
                  checked={getTriggerValue('sendIndividualReportsOnScheduledRun', false)}
                  onChange={(checked) => updateTriggerConfig(prev => ({
                    ...prev,
                    triggers: { ...prev.triggers, sendIndividualReportsOnScheduledRun: checked }
                  }))}
                  ariaLabel="Send individual reports on scheduled runs"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Send reports when updates found</label>
                  <p className="text-xs text-muted-foreground">Send notifications immediately when container updates are detected</p>
                </div>
                <Toggle
                  checked={getTriggerValue('sendReportsWhenUpdatesFound', true)}
                  onChange={(checked) => updateTriggerConfig(prev => ({
                    ...prev,
                    triggers: { ...prev.triggers, sendReportsWhenUpdatesFound: checked }
                  }))}
                  ariaLabel="Send reports when updates found"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Send reports on errors</label>
                  <p className="text-xs text-muted-foreground">Send notifications when errors occur during monitoring</p>
                </div>
                <Toggle
                  checked={getTriggerValue('sendReportsOnErrors', true)}
                  onChange={(checked) => updateTriggerConfig(prev => ({
                    ...prev,
                    triggers: { ...prev.triggers, sendReportsOnErrors: checked }
                  }))}
                  ariaLabel="Send reports on errors"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apprise Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <SectionHeader
          icon={Bell}
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
                        ? ((prev.apprise?.channels && prev.apprise.channels.length > 0)
                            ? prev.apprise.channels
                            : [{ name: '', url: '', enabled: true }])
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
        <div className="mt-3 space-y-3">
          {localConfig.apprise?.enabled ? (
            <>
              <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-xs">
                <span><strong>Apprise:</strong> Supports 80+ services (Discord, Slack, Email, SMS, etc.)</span>
                <a href="https://github.com/caronc/apprise#supported-notifications" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Supported services →
                </a>
              </div>
              
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Channels</h4>
                <button
                  onClick={addAppriseChannel}
                  className="flex items-center space-x-1 px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {localConfig.apprise?.channels?.map((channel, index) => (
                <div key={index} className="p-3 border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Toggle
                        checked={channel.enabled}
                        onChange={(checked) => updateAppriseChannel(index, 'enabled', checked)}
                        ariaLabel={`Enable channel ${index + 1}`}
                      />
                      <h5 className="font-medium text-foreground text-sm">Channel {index + 1}</h5>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={handleTestApprise}
                        disabled={testing === 'apprise' || !localConfig.apprise?.channels?.some(c => c.enabled && c.url)}
                        className="flex items-center space-x-1 px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <TestTube className="w-3 h-3" />
                        <span>{testing === 'apprise' ? 'Sending...' : 'Test'}</span>
                      </button>
                      <button
                        onClick={() => removeAppriseChannel(index)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={channel.name}
                      onChange={(e) => updateAppriseChannel(index, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-input rounded bg-background text-foreground text-sm"
                      placeholder="Channel name"
                    />
                    <input
                      type="text"
                      value={channel.url}
                      onChange={(e) => updateAppriseChannel(index, 'url', e.target.value)}
                      className="w-full px-2 py-1 border border-input rounded bg-background text-foreground text-sm"
                      placeholder="discord://webhook_id/webhook_token"
                    />
                  </div>
                </div>
              ))}
              
              {(!localConfig.apprise?.channels || localConfig.apprise.channels.length === 0) && (
                <p className="text-muted-foreground text-center py-3 text-sm">
                  No channels configured. Click "Add" to get started.
                </p>
              )}
              
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Enable Apprise to configure notification channels</p>
          )}
        </div>
        )}
      </div>
    </div>
  );
}