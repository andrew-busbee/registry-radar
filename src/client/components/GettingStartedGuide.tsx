import { 
  Plus, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Bell, 
  ArrowRight,
  Container,
  RefreshCw,
  X,
  XCircle
} from 'lucide-react';

interface GettingStartedGuideProps {
  onAddContainer: () => void;
  onBulkImport: () => void;
  onSkip?: () => void;
}

export function GettingStartedGuide({ 
  onAddContainer, 
  onBulkImport, 
  onSkip 
}: GettingStartedGuideProps) {

  return (
    <div className="bg-card rounded-lg p-8 w-1/2">
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="space-y-4 text-left">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Container className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome to Registry Radar
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Tired of manually checking if your Docker images have updates? Use Registry Radar to monitor your Docker images for updates across multiple registries. Get notified when new versions are available so you can keep your deployments up to date.
          </p>
        </div>

        {/* What Registry Radar Does */}
        <div className="space-y-4 text-left">
        </div>

        {/* Horizontal break */}
        <hr className="border-border" />

        {/* Why You Need This */}
        <div className="space-y-4 text-left">
          <h2 className="text-xl font-semibold text-primary">Why You Need This</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 dark:text-red-400 text-sm">🔒</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Security</p>
                <p className="text-sm text-muted-foreground">Stay protected with latest patches</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 dark:text-green-400 text-sm">⚡</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Performance</p>
                <p className="text-sm text-muted-foreground">Get bug fixes and improvements</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 dark:text-blue-400 text-sm">🛡️</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Reliability</p>
                <p className="text-sm text-muted-foreground">Maintain stable, reliable deployments</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 dark:text-purple-400 text-sm">⏰</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Efficiency</p>
                <p className="text-sm text-muted-foreground">Stop wasting time on manual checks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Registry Support */}
        <div className="space-y-4 text-left">
          <p className="text-lg text-muted-foreground">
            Currently Supports: Docker Hub (with optional authentication), GitHub Container Registry, and LinuxServer.io. Additional registry support is being added.
          </p>
        </div>

        {/* Horizontal break */}
        <hr className="border-border" />

        {/* How It Works */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-primary">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center space-y-3 p-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-medium text-foreground">1. Add Images</h3>
              <p className="text-sm text-muted-foreground text-center">
                Add Docker image paths you want to monitor from Docker Hub, GitHub Container Registry, and more.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-medium text-foreground">2. Monitor Updates</h3>
              <p className="text-sm text-muted-foreground text-center">
                Registry Radar checks your images regularly and compares versions with the registry.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-medium text-foreground">3. Get Notified</h3>
              <p className="text-sm text-muted-foreground text-center">
                Receive notifications when updates are available via Apprise (Discord, Slack, Email, etc.) or in-app alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal break */}
        <hr className="border-border" />

        {/* Status Indicators Guide */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-primary">Understanding Status Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Never Checked</p>
                <p className="text-xs text-muted-foreground">Initial state</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Up to Date</p>
                <p className="text-xs text-muted-foreground">No updates available</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Update Available</p>
                <p className="text-xs text-muted-foreground">New version found</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Error / Warning</p>
                <p className="text-xs text-muted-foreground">Issues detected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal break */}
        <hr className="border-border" />

        {/* Notifications */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-primary">Stay Notified</h2>
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Never miss an update! Registry Radar can send you notifications through multiple channels when new image versions are available or when issues occur.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-foreground flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  <span>Apprise Integration</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Send notifications to 80+ services including Discord, Slack, Email, SMS, and more. Configure multiple channels to ensure you never miss important updates.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="font-medium text-foreground flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-green-500" />
                  <span>Smart Triggers</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Customize your notification preferences and choose when you want to receive notifications: After scheduled checks, when updates are found, when errors occur, or all of them.
                </p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                <strong>💡 Tip:</strong> Set up notifications in Settings → Notifications. You can test your notification setup to confirm it is working.
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal break */}
        <hr className="border-border" />

        {/* Quick Start Options */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-primary">Let's Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={onAddContainer}
              className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <Plus className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <h3 className="font-medium text-foreground">Add Your First Image</h3>
                <p className="text-sm text-muted-foreground">Add one Docker image to monitor</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <button
              onClick={onBulkImport}
              className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <Upload className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <h3 className="font-medium text-foreground">Bulk Import Images</h3>
                <p className="text-sm text-muted-foreground">Import multiple images at once</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>
        </div>

        {/* Skip Option */}
        {onSkip && (
          <div className="pt-4">
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1 mx-auto"
            >
              <X className="w-4 h-4" />
              <span>Skip this guide</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
