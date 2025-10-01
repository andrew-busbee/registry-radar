import { useState, useEffect } from 'react';
import { Save, Bell, Smartphone, MessageSquare, TestTube, Plus, Trash2, Mail } from 'lucide-react';
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

  // Only sync with parent config if we don't have unsaved local changes
  useEffect(() => {
    if (!hasLocalChanges) {
      setLocalConfig(config);
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

  const handleTestPushover = async () => {
    setTesting('pushover');
    try {
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
    } finally {
      setTesting(null);
    }
  };

  const handleTestDiscord = async () => {
    setTesting('discord');
    try {
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
    } finally {
      setTesting(null);
    }
  };

  const handleTestEmail = async () => {
    setTesting('email');
    try {
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
    } finally {
      setTesting(null);
    }
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Notification Settings</h2>
        <p className="text-muted-foreground text-sm">
          Configure external notifications for container updates and system events
        </p>
      </div>

      {/* Trigger Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
          <Bell className="w-5 h-5" />
          <span>Notification Triggers</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={localConfig.triggers.onEveryRun}
              onChange={(e) => updateLocalConfig(prev => ({
                ...prev,
                triggers: { ...prev.triggers, onEveryRun: e.target.checked }
              }))}
              className="w-4 h-4 text-primary mt-0.5"
            />
            <div>
              <label className="font-medium text-foreground">On Every Scheduled Run</label>
              <p className="text-sm text-muted-foreground">Send notification for every scheduled check, even if no updates are found</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={localConfig.triggers.onNewUpdates}
              onChange={(e) => updateLocalConfig(prev => ({
                ...prev,
                triggers: { ...prev.triggers, onNewUpdates: e.target.checked }
              }))}
              className="w-4 h-4 text-primary mt-0.5"
            />
            <div>
              <label className="font-medium text-foreground">On New Updates Found</label>
              <p className="text-sm text-muted-foreground">Send notification when new container versions are detected</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={localConfig.triggers.onErrors}
              onChange={(e) => updateLocalConfig(prev => ({
                ...prev,
                triggers: { ...prev.triggers, onErrors: e.target.checked }
              }))}
              className="w-4 h-4 text-primary mt-0.5"
            />
            <div>
              <label className="font-medium text-foreground">On Errors</label>
              <p className="text-sm text-muted-foreground">Send notification when registry checks fail</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={localConfig.triggers.onManualCheck}
              onChange={(e) => updateLocalConfig(prev => ({
                ...prev,
                triggers: { ...prev.triggers, onManualCheck: e.target.checked }
              }))}
              className="w-4 h-4 text-primary mt-0.5"
            />
            <div>
              <label className="font-medium text-foreground">On Manual Checks</label>
              <p className="text-sm text-muted-foreground">Send notification for manually triggered registry checks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Discord Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>Discord Notifications</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={localConfig.discord?.enabled || false}
              onChange={(e) => updateLocalConfig(prev => ({
                ...prev,
                discord: {
                  ...prev.discord,
                  enabled: e.target.checked,
                  webhooks: prev.discord?.webhooks || []
                }
              }))}
              className="w-4 h-4 text-primary mt-0.5"
            />
            <div>
              <label className="font-medium text-foreground">Enable Discord</label>
              <p className="text-sm text-muted-foreground">Send notifications to Discord channels via webhooks</p>
            </div>
          </div>
          
          {localConfig.discord?.enabled && (
            <>
              <div className="space-y-3">
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
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={webhook.name}
                        onChange={(e) => updateDiscordWebhook(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="Webhook name (e.g., Production Alerts)"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        value={webhook.url}
                        onChange={(e) => updateDiscordWebhook(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="https://discord.com/api/webhooks/..."
                      />
                    </div>
                  </div>
                ))}
                
                {(!localConfig.discord?.webhooks || localConfig.discord.webhooks.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No webhooks configured. Click "Add Webhook" to add your first Discord webhook.
                  </p>
                )}
              </div>
              
              <button
                onClick={handleTestDiscord}
                disabled={testing === 'discord' || !localConfig.discord?.webhooks?.some(w => w.url)}
                className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
              >
                <TestTube className="w-4 h-4" />
                <span>{testing === 'discord' ? 'Testing...' : 'Test Discord'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pushover Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
          <Smartphone className="w-5 h-5" />
          <span>Pushover Notifications</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={localConfig.pushover?.enabled || false}
              onChange={(e) => updateLocalConfig(prev => ({
                ...prev,
                pushover: {
                  ...prev.pushover,
                  enabled: e.target.checked,
                  apiKey: prev.pushover?.apiKey || '',
                  userKey: prev.pushover?.userKey || '',
                  devices: prev.pushover?.devices || []
                }
              }))}
              className="w-4 h-4 text-primary mt-0.5"
            />
            <div>
              <label className="font-medium text-foreground">Enable Pushover</label>
              <p className="text-sm text-muted-foreground">Send notifications to your mobile devices via Pushover</p>
            </div>
          </div>
          
          {localConfig.pushover?.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  API Key
                </label>
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  User Key
                </label>
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
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Devices (Optional)
                </label>
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
              
              <button
                onClick={handleTestPushover}
                disabled={testing === 'pushover' || !localConfig.pushover?.apiKey || !localConfig.pushover?.userKey}
                className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
              >
                <TestTube className="w-4 h-4" />
                <span>{testing === 'pushover' ? 'Testing...' : 'Test Pushover'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Email Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
          <Mail className="w-5 h-5" />
          <span>Email Notifications</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={localConfig.email?.enabled || false}
              onChange={(e) => updateLocalConfig(prev => ({
                ...prev,
                email: {
                  ...prev.email,
                  enabled: e.target.checked,
                  host: prev.email?.host || '',
                  port: prev.email?.port || 587,
                  username: prev.email?.username || '',
                  password: prev.email?.password || '',
                  toEmails: prev.email?.toEmails || [],
                  fromEmail: prev.email?.fromEmail || '',
                  fromName: prev.email?.fromName || 'Registry Radar'
                }
              }))}
              className="w-4 h-4 text-primary mt-0.5"
            />
            <div>
              <label className="font-medium text-foreground">Enable Email</label>
              <p className="text-sm text-muted-foreground">Send notifications via email using your SMTP server</p>
            </div>
          </div>
          
          {localConfig.email?.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    SMTP Host *
                  </label>
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    SMTP Port *
                  </label>
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email/Username *
                  </label>
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Password *
                  </label>
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    From Email (Optional)
                  </label>
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    From Name (Optional)
                  </label>
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  To Emails * (comma-separated)
                </label>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Multiple emails can be separated by commas
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>📌 Gmail Users:</strong> Use an App Password instead of your regular password. 
                  <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                    Learn how
                  </a>
                </p>
              </div>
              
              <button
                onClick={handleTestEmail}
                disabled={testing === 'email' || !localConfig.email?.host || !localConfig.email?.username || !localConfig.email?.password || !localConfig.email?.toEmails?.length}
                className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
              >
                <TestTube className="w-4 h-4" />
                <span>{testing === 'email' ? 'Testing...' : 'Test Email'}</span>
              </button>
            </>
          )}
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
            <span>Save Notification Settings</span>
          </>
        )}
      </button>
    </div>
  );
}
