# Registry Radar

Registry Radar monitors container images across multiple registries and notifies you of updates.  A modern TypeScript application for monitoring Docker container registries (Docker Hub and GitHub Container Registry) for updates. Built with React, Express, and TypeScript.

## Features

- 🔍 **Registry Monitoring**: Monitor Docker Hub, GitHub Container Registry, and others for updates
- ⏰ **Cron Scheduling**: Configurable cron jobs for automatic checks
- 🎨 **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- 📱 **Real-time Notifications**: Toast notifications for container updates
- 📊 **Dashboard**: Overview of all monitored containers and their status
- ⚙️ **No Database Required**: Uses YAML and JSON files for configuration and state
- 🐳 **Docker Ready**: Fully containerized with Docker Compose

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd registry-radar
```

2. Start the application:
```bash
docker-compose up -d
```

3. Open your browser and navigate to `http://localhost:3001`

⚠️ **Important Security Note:**
The application does not yet include authentication. If this is deployed in a production environment, you may want to consider:
- Network-level security (firewall, VPN)
- Reverse proxy authentication
- Basic HTTP authentication at the web server level

### Manual Setup

1. Install dependencies:
```bash
npm install
```

2. Build the application:
```bash
npm run build
```

3. Start the server:
```bash
npm start
```

4. For development:
```bash
npm run dev
```

## Configuration

### Adding Containers

The application uses a YAML file (`data/containers.yml`) to store container configurations:

```yaml
containers:
  - name: "nginx"
    image: "nginx"
    tag: "latest"
    registry: "dockerhub"
  
  - name: "my-app"
    image: "my-app"
    tag: "v1.0.0"
    registry: "github"
    namespace: "myorg"
```

### Registry Types

#### Docker Hub
```yaml
# With specific tag
- name: "nginx"
  image: "nginx"
  tag: "latest"
  registry: "dockerhub"

# Without tag (defaults to 'latest')
- name: "planning-poker"
  image: "andrewbusbee/planning-poker"
  registry: "dockerhub"
```

#### GitHub Container Registry
```yaml
# With specific tag
- name: "my-app"
  image: "my-app"
  tag: "v1.0.0"
  registry: "github"
  namespace: "myorg"  # Required for GitHub

# Without tag (defaults to 'latest')
- name: "my-app-latest"
  image: "my-app"
  registry: "github"
  namespace: "myorg"
```

### Cron Configuration

The cron schedule is configured in `data/cron.yml`:

```yaml
cron:
  schedule: "0 9 * * *"  # Daily at 9 AM
  enabled: true
```

## API Endpoints

### Containers
- `GET /api/config/containers` - Get all containers
- `POST /api/config/containers` - Add a new container
- `PUT /api/config/containers/:index` - Update a container
- `DELETE /api/config/containers/:index` - Delete a container

### Registry Checks
- `GET /api/registry/states` - Get container states
- `POST /api/registry/check` - Check all registries
- `POST /api/registry/check/:index` - Check specific container

### Cron Management
- `GET /api/cron/config` - Get cron configuration
- `PUT /api/cron/config/schedule` - Update cron schedule
- `PUT /api/cron/config/enabled` - Enable/disable cron

### Notifications
- `GET /api/notifications` - Get all notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications` - Clear all notifications

## File Structure

```
registry-radar/
├── src/
│   ├── client/          # React frontend
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   └── types.ts     # TypeScript types
│   └── server/          # Express backend
│       ├── routes/      # API routes
│       ├── services/    # Business logic
│       └── types.ts     # TypeScript types
├── data/                # Configuration and state files
│   ├── containers.yml   # Container configurations
│   ├── cron.yml        # Cron configuration
│   ├── state.json      # Container states
│   └── notifications.json # Notifications
├── docker-compose.yml   # Docker Compose configuration
└── Dockerfile          # Docker image definition
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Environment Variables
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Deployment

### Docker Compose
The application is ready for deployment using Docker Compose:

```bash
docker-compose up -d
```

### Docker
Build and run manually:

```bash
docker build -t registry-radar .
docker run -p 3001:3001 -v $(pwd)/data:/app/data registry-radar
```

### Environment Variables
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (default: production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please create an issue in the repository.
