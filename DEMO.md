# Registry Radar - Demo Guide

## 🎯 What This Application Does

Registry Radar is a modern TypeScript application that monitors Docker container registries (Docker Hub and GitHub Container Registry) for updates. It provides a clean web interface to manage containers and get notified when new versions are available.

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)
```bash
# Clone and setup
git clone <repository-url>
cd registry-radar

# Run setup script
./setup.sh  # Linux/Mac
# or
setup.bat   # Windows

# Start the application
docker-compose up -d

# Open browser
open http://localhost:3001
```

### Option 2: Development Mode
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser (frontend: http://localhost:3000, backend: http://localhost:3001)
```

## 🎮 Demo Walkthrough

### 1. Dashboard Overview
- View total containers, up-to-date count, and available updates
- See recent notifications and container updates
- Quick action to check all registries manually

### 2. Container Management
- **Add Containers**: Click "Add Container" to monitor new registries
  - Docker Hub: `nginx`, `node`, `redis` (no namespace needed)
  - GitHub: `ghcr.io/owner/repo` (namespace required)
- **Edit/Delete**: Use the edit and delete buttons on each container card
- **Manual Check**: Click the refresh icon to check for updates immediately

### 3. Settings & Cron Configuration
- **Schedule Configuration**: Set when to automatically check for updates
  - Default: Daily at 9 AM UTC (`0 9 * * *`)
  - Quick presets: Every hour, every 6 hours, daily, weekly
  - Custom cron expressions supported
- **Enable/Disable**: Toggle automatic checking on/off
- **Real-time Status**: See if cron is running and enabled

### 4. Notifications
- **Real-time Updates**: Toast notifications appear when updates are found
- **Notification Center**: View all notifications with filtering
- **Mark as Read**: Click notifications to mark them as read
- **Clear All**: Remove all notifications

## 📋 Example Container Configurations

### Docker Hub Examples
```yaml
containers:
  - name: "nginx"
    image: "nginx"
    tag: "latest"
    registry: "dockerhub"
  
  - name: "node"
    image: "node"
    tag: "18-alpine"
    registry: "dockerhub"
  
  - name: "redis"
    image: "redis"
    tag: "7-alpine"
    registry: "dockerhub"
```

### GitHub Container Registry Examples
```yaml
containers:
  - name: "my-app"
    image: "my-app"
    tag: "v1.0.0"
    registry: "github"
    namespace: "myorg"
  
  - name: "custom-image"
    image: "custom-image"
    tag: "latest"
    registry: "github"
    namespace: "myusername"
```

## 🔧 Key Features Demonstrated

### 1. **No Database Required**
- Uses YAML files for configuration (`data/containers.yml`)
- JSON files for state tracking (`data/state.json`)
- JSON files for notifications (`data/notifications.json`)

### 2. **Modern UI/UX**
- Responsive design that works on desktop and mobile
- Clean, professional interface with Tailwind CSS
- Real-time updates and notifications
- Intuitive navigation and controls

### 3. **Registry Integration**
- **Docker Hub API**: Fetches manifest digests for version comparison
- **GitHub Container Registry**: Supports `ghcr.io` with namespace requirements
- **Rate Limiting**: Built-in delays to avoid API limits

### 4. **Cron Job Management**
- **Flexible Scheduling**: Standard cron expressions
- **Runtime Control**: Start/stop without restarting application
- **Status Monitoring**: Real-time status of cron jobs
- **Quick Presets**: Common scheduling patterns

### 5. **Notification System**
- **Update Notifications**: Alert when new container versions are available
- **Error Notifications**: Notify when registry checks fail
- **Toast Notifications**: Non-intrusive real-time alerts
- **Notification Center**: Manage all notifications in one place

## 🐳 Docker Deployment

The application is fully containerized and production-ready:

```yaml
# docker-compose.yml
services:
  registry-radar:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## 📊 API Endpoints

The application exposes a RESTful API:

- **GET** `/api/config/containers` - List all containers
- **POST** `/api/config/containers` - Add new container
- **PUT** `/api/config/containers/:index` - Update container
- **DELETE** `/api/config/containers/:index` - Remove container
- **POST** `/api/registry/check` - Check all registries
- **GET** `/api/notifications` - Get notifications
- **PUT** `/api/cron/config/schedule` - Update cron schedule

## 🎨 UI Components

### Dashboard
- Statistics cards showing container counts and status
- Recent updates and notifications
- Quick action buttons

### Container Management
- Add/edit/delete containers with form validation
- Real-time status indicators
- Manual check buttons with loading states

### Settings
- Cron expression builder with preview
- Quick preset buttons
- Real-time status indicators

### Notifications
- Toast notifications for real-time alerts
- Notification center with filtering
- Mark as read functionality

## 🔍 Technical Highlights

- **TypeScript**: Full type safety across frontend and backend
- **React**: Modern functional components with hooks
- **Express**: RESTful API with middleware
- **Tailwind CSS**: Utility-first styling
- **Node-cron**: Robust cron job scheduling
- **YAML/JSON**: File-based configuration (no database)
- **Docker**: Multi-stage builds for production optimization

## 🚀 Production Features

- **Health Checks**: Docker health check endpoints
- **Error Handling**: Comprehensive error handling and logging
- **Security**: Helmet.js for security headers
- **Performance**: Optimized builds and caching
- **Monitoring**: Built-in status endpoints
- **Scalability**: Stateless design for horizontal scaling

This application demonstrates modern web development practices with a focus on simplicity, maintainability, and user experience.
