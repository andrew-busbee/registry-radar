# Registry Radar

**Get notified of Docker container updates automatically!**

Registry Radar is a simple web application that monitors your Docker container images for updates and sends you notifications when new versions are available. Instead of manually checking for updates, let Registry Radar do the work for you.

## What does it do?

Registry Radar continuously watches your container images (like `nginx`, `postgres`, or your own apps) and tells you when newer versions are released. You'll get notifications through the web interface, and optionally via email or other notification services.

Perfect for developers and system administrators who want to stay on top of security updates and new features without the hassle of manual checking.

## Key Features

- 🔍 **Monitor Multiple Registries**: Works with Docker Hub, GitHub Container Registry, and more
- ⏰ **Automatic Checking**: Set up schedules to check for updates daily, weekly, or whenever you want
- 🎨 **Easy-to-Use Interface**: Clean, modern web interface that anyone can use
- 📱 **Instant Notifications**: See update notifications right in your browser
- 📊 **Dashboard View**: Get an overview of all your containers and their update status
- ⚙️ **No Database Needed**: Everything is stored in simple files - no complex setup required
- 🐳 **Docker Ready**: Runs in Docker with just one command
- 🎉 **Application Notifications**: Notifications from the app are available via Email, Pushover, and Discord 

## Getting Started

The easiest way to run Registry Radar is with Docker Compose. You'll be up and running in just a few minutes!

### Option 1: Using Docker Compose (Recommended)

1. **Download the project:**
```bash
git clone <repository-url>
cd registry-radar
```

2. **Start Registry Radar:**
```bash
docker-compose up -d
```

3. **Open your browser:**
Go to `http://localhost:3001` and you'll see the Registry Radar interface.

That's it! Your Registry Radar is now running and ready to monitor your containers.

### Option 2: Using Docker CLI

If you prefer to use Docker commands directly:

```bash
# Create a directory for your data
mkdir registry-radar-data

# Run Registry Radar
docker run -d \
  --name registry-radar \
  -p 3001:3001 \
  -v $(pwd)/registry-radar-data:/app/data \
  --restart unless-stopped \
  andrewbusbee/registry-radar:0.1.0-beta.1
```

Then open `http://localhost:3001` in your browser.

⚠️ **Security Note:**
Registry Radar doesn't have built-in user authentication yet. If you're planning to use it in a production environment where others might access it, consider:
- Using a reverse proxy with authentication (like nginx with basic auth)
- Restricting network access with a firewall
- Running it on a private network or VPN

## How to Use Registry Radar

Once Registry Radar is running, you can start adding containers to monitor. The web interface makes this easy - just click "Add Container" and fill in the details.

### Adding Containers to Monitor

You can add containers in two ways:

1. **Through the Web Interface** (Easiest):
   - Open the Registry Radar web interface
   - Click "Add Container" 
   - Fill in the container name, image, and tag
   - Registry Radar will automatically detect if it's from Docker Hub or GitHub

2. **By Editing Configuration Files** (Advanced):
   - Edit the `data/containers.yml` file directly
   - Add your container information in YAML format

### Example Container Configurations

Here are some common examples:

**Popular Docker Hub Images:**
```yaml
containers:
  # Monitor the latest nginx image
  - name: "nginx"
    image: "nginx"
    tag: "latest"
    registry: "dockerhub"
  
  # Monitor a specific version of postgres
  - name: "postgres"
    image: "postgres"
    tag: "15"
    registry: "dockerhub"
```

**GitHub Container Registry:**
```yaml
containers:
  # Monitor your own GitHub container
  - name: "my-app"
    image: "my-app"
    tag: "v1.0.0"
    registry: "github"
    namespace: "myorg"  # Your GitHub username or organization
```

### Setting Up Automatic Checks

Registry Radar can automatically check for updates on a schedule. By default, it checks daily at 9 AM, but you can change this:

- **Through the Web Interface**: Go to Settings → Cron Configuration
- **By Editing Files**: Modify `data/cron.yml`

Example schedule configurations:
```yaml
# Check daily at 9 AM (default)
schedule: "0 9 * * *"

# Check every 6 hours
schedule: "0 */6 * * *"

# Check weekly on Monday at 8 AM
schedule: "0 8 * * 1"
```

## Notification Options

Registry Radar can send you notifications when container updates are found or errors occur. You can configure multiple notification types to stay informed about your containers.

### Available Notification Types

#### 📧 **Email Notifications**
Get beautifully formatted HTML emails when updates are detected. Perfect for staying informed without being overwhelmed.

**Setup:**
1. Go to Settings → Notifications in the web interface
2. Enable email notifications
3. Configure your SMTP settings (Gmail, Outlook, or your own email server)
4. Add recipient email addresses

**Example Configuration:**
```yaml
# In data/notifications.yml
email:
  enabled: true
  host: "smtp.gmail.com"        # Your email provider's SMTP server
  port: 587                     # Usually 587 for STARTTLS or 465 for SSL
  username: "your-email@gmail.com"
  password: "your-app-password" # Use app-specific passwords for Gmail
  fromEmail: "your-email@gmail.com"  # Optional: custom sender email
  fromName: "Registry Radar"    # Optional: custom sender name
  toEmails: ["admin@company.com", "dev-team@company.com"]
```

#### 💬 **Discord Notifications**
Send rich embed messages to Discord channels via webhooks. Great for team collaboration.

**Setup:**
1. Create a Discord webhook in your server
2. Add the webhook URL in Settings → Notifications
3. Customize the webhook name for easy identification

**Example Configuration:**
```yaml
# In data/notifications.yml
discord:
  enabled: true
  webhooks:
    - name: "Production Alerts"
      url: "https://discord.com/api/webhooks/..."
    - name: "Development Updates"  
      url: "https://discord.com/api/webhooks/..."
```

#### 📱 **Pushover Notifications**
Send push notifications to your mobile devices. Ideal for critical updates that need immediate attention.

**Setup:**
1. Install the Pushover app on your devices
2. Get your user key from the Pushover website
3. Create an application and get your API key
4. Configure both keys in Settings → Notifications

**Example Configuration:**
```yaml
# In data/notifications.yml
pushover:
  enabled: true
  apiKey: "your_pushover_app_api_key"
  userKey: "your_pushover_user_key"
  devices: ["phone", "tablet"]  # Optional: target specific devices
```

### Notification Triggers

You can control when notifications are sent:

```yaml
# In data/notifications.yml
triggers:
  onEveryRun: false        # Send notification for every scheduled check
  onNewUpdates: true       # Send notification when new updates are found
  onErrors: true          # Send notification when errors occur
  onManualCheck: false    # Send notification for manual checks
```

### Testing Your Notifications

After setting up notifications, you can test them:
- **Email**: Click "Test Email" in the notification settings
- **Discord**: Send a test message to verify webhook connectivity
- **Pushover**: Send a test notification to your devices

## Advanced Setup (For Developers)

If you want to run Registry Radar from source code instead of using Docker:

### Prerequisites
- Node.js 18 or newer
- npm or yarn package manager

### Manual Installation

1. **Download and install dependencies:**
```bash
git clone <repository-url>
cd registry-radar
npm install
```

2. **Build the application:**
```bash
npm run build
```

3. **Start the server:**
```bash
npm start
```

4. **For development with auto-reload:**
```bash
npm run dev
```

### Environment Variables

You can customize Registry Radar with these environment variables:
- `PORT` - The port to run on (default: 3001)
- `NODE_ENV` - Set to 'development' or 'production'
- `DOCKERHUB_USERNAME` - Your Docker Hub username (optional, increases rate limits)
- `DOCKERHUB_PASSWORD` - Your Docker Hub password/token (optional)

## Deployment Options

### Production Deployment

For production use, we recommend using Docker Compose as it handles everything automatically:

```bash
# Start in production mode
docker-compose up -d

# Check if it's running
docker-compose ps

# View logs
docker-compose logs -f
```

### Custom Docker Deployment

If you need more control, you can build and run manually:

```bash
# Build the image
docker build -t registry-radar .

# Run with custom settings
docker run -d \
  --name registry-radar \
  -p 3001:3001 \
  -v /path/to/your/data:/app/data \
  --restart unless-stopped \
  registry-radar
```

## Troubleshooting

### Common Issues

**Registry Radar won't start:**
- Check if port 3001 is already in use: `docker ps` or `netstat -tulpn | grep 3001`
- Make sure Docker is running: `docker --version`

**Can't access the web interface:**
- Verify the container is running: `docker-compose ps`
- Check the logs: `docker-compose logs registry-radar`
- Try accessing `http://localhost:3001` (not https)

**Container checks are failing:**
- Check your internet connection
- Verify container names and tags are correct
- For GitHub containers, make sure you've specified the namespace

### Getting Help

If you run into issues:
1. Check the container logs: `docker-compose logs registry-radar`
2. Look at the web interface - it often shows helpful error messages
3. Create an issue on GitHub with your error details

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository** on GitHub
2. **Create a feature branch** for your changes
3. **Make your changes** and test them thoroughly
4. **Add tests** if applicable
5. **Submit a pull request** with a clear description

For major changes, please open an issue first to discuss what you'd like to change.

---

## Technical Reference (For Developers)

### API Endpoints

If you're building integrations or need programmatic access:

**Container Management:**
- `GET /api/config/containers` - Get all containers
- `POST /api/config/containers` - Add a new container
- `PUT /api/config/containers/:index` - Update a container
- `DELETE /api/config/containers/:index` - Delete a container

**Registry Operations:**
- `GET /api/registry/states` - Get container states
- `POST /api/registry/check` - Check all registries
- `POST /api/registry/check/:index` - Check specific container

**Cron Management:**
- `GET /api/cron/config` - Get cron configuration
- `PUT /api/cron/config/schedule` - Update cron schedule
- `PUT /api/cron/config/enabled` - Enable/disable cron

**Notifications:**
- `GET /api/notifications` - Get all notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications` - Clear all notifications

### Project Structure

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

### Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run lint` - Run ESLint for code quality
- `npm run type-check` - Run TypeScript type checking

---

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please create an issue in the repository.
