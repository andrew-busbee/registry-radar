import { Activity, Monitor, Eye, Search, Target, Satellite, Wifi, Container, Package, Box, Layers, Archive, Zap, Radio, Waves, BarChart3 } from 'lucide-react';

export function IconShowcase() {
  const icons = [
    { name: 'Activity', icon: Activity, description: 'Pulse lines - great for monitoring' },
    { name: 'Monitor', icon: Monitor, description: 'Computer monitor' },
    { name: 'Eye', icon: Eye, description: 'Eye for monitoring' },
    { name: 'Search', icon: Search, description: 'Search/magnifying glass' },
    { name: 'Target', icon: Target, description: 'Target/bullseye' },
    { name: 'Satellite', icon: Satellite, description: 'Satellite icon' },
    { name: 'Wifi', icon: Wifi, description: 'Signal strength bars' },
    { name: 'Zap', icon: Zap, description: 'Lightning bolt - energy/activity' },
    { name: 'Radio', icon: Radio, description: 'Radio waves' },
    { name: 'Waves', icon: Waves, description: 'Sound/radio waves' },
    { name: 'BarChart3', icon: BarChart3, description: 'Analytics/monitoring' },
    { name: 'Container', icon: Container, description: 'Current - container icon' },
    { name: 'Package', icon: Package, description: 'Package/box' },
    { name: 'Box', icon: Box, description: 'Simple box' },
    { name: 'Layers', icon: Layers, description: 'Stacked layers' },
    { name: 'Archive', icon: Archive, description: 'Archive/container' },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Logo Icon Options</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {icons.map(({ name, icon: Icon, description }) => (
          <div key={name} className="flex flex-col items-center p-3 border border-border rounded-lg hover:bg-accent transition-colors">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mb-2">
              <Icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-sm font-medium text-foreground text-center">{name}</div>
            <div className="text-xs text-muted-foreground text-center mt-1">{description}</div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-muted rounded-lg">
        <h3 className="font-medium text-foreground mb-2">Current Choice: Activity Icon</h3>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Registry Radar</div>
            <div className="text-xs text-muted-foreground">With pulsing animation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
