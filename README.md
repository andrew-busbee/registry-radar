[![Release](https://img.shields.io/github/v/release/andrewbusbee/registry-radar?logo=github&label=Release)](https://github.com/andrewbusbee/registry-radar/releases)
[![Last commit](https://img.shields.io/github/last-commit/andrewbusbeeregistry-radar?logo=github&label=Last%20commit)](https://github.com/andrewbusbee/registry-radar/commits/main)

[![Release](https://img.shields.io/docker/v/andrewbusbee/registry-radar?sort=semver&logo=docker&label=Release)](https://hub.docker.com/r/andrewbusbee/registry-radar/tags)
[![Pulls](https://img.shields.io/docker/pulls/andrewbusbee/registry-radar?logo=docker&label=Pulls)](https://hub.docker.com/r/andrewbusbee/registry-radar)
[![Image size](https://img.shields.io/docker/image-size/andrewbusbee/registry-radar/latest?logo=docker&label=Image%20size)](https://hub.docker.com/r/andrewbusbee/registry-radar)

[![License](https://img.shields.io/github/license/andrewbusbee/registry-radar?branch=main&cacheSeconds=60&v=4)](https://github.com/andrewbusbee/registry-radar/blob/main/LICENSE)

# Registry Radar

**Get notified of updated Docker images automatically!**

Registry Radar is a simple web application that monitors Docker images for updates and sends you notifications when new versions are available. Instead of manually checking for updates, let Registry Radar do the work for you.

Perfect for developers and system administrators who want to stay on top of security updates and new features without the hassle of manual checking.

## Key Features

- 🔍 **Monitor Multiple Registries**: Works with Docker Hub, GitHub Container Registry, and more
- 🛰️ **Registry Radar Agent**: Optional lightweight companion for remote Docker hosts; auto-discovers running containers and streams updates securely for multi-host monitoring
- ⏰ **Automatic Checking**: Set up schedules to check for updates daily, weekly, or whenever you want
- 🎨 **Easy-to-Use Interface**: Clean, modern web interface that anyone can use
- 📱 **Instant Notifications**: See update notifications right in your browser
- 📊 **Dashboard View**: Get an overview of all your images and their update status
- ⚙️ **No Database Needed**: Everything is stored in simple files - no complex setup required
- 🐳 **Docker Ready**: Runs in Docker with just one command
- 🎉 **Application Notifications**: Notifications from the app are available via Apprise (Discord, Slack, Email, SMS, and 80+ other services) 

## Getting Started

The easiest way to run Registry Radar is with Docker Compose. You'll be up and running in just a few minutes!

### Option 1: Using Docker Compose (Recommended)

1. **Create a docker-compose.yml with the following content:** 
```yml
services:
  registry-radar:
    image: ghcr.io/andrewbusbee/registry-radar:0.1.0-beta.8 # Tag will become latest when released
    container_name: registry-radar
    ports:
      - "3001:3001"
    volumes:
      - data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3001
      - APPRISE_URL=http://apprise:8000
      # Public URL (required for registry radar agent use)
      # Set your public Registry Radar URL or internal IP:PORT 
      - REGISTRY_RADAR_URL=https://registry-radar.your-domain.com or http://IP:PORT
      # Docker Hub Authentication (optional)
      # Increases rate limit from 100 to 200 pulls/6hr (or unlimited with Pro account)
      # Uncomment and set your credentials to enable:
      # - DOCKERHUB_USERNAME=your_username
      # - DOCKERHUB_PASSWORD=your_password_or_token
    restart: unless-stopped
    networks:
      - registry-radar-network

  apprise:
    image: caronc/apprise:latest
    container_name: apprise
    ports:
      - "8000:8000"
    environment:
      - APPRISE_ALLOW_HOSTS=registry-radar # Only allow connections from registry-radar container
    restart: unless-stopped
    networks:
      - registry-radar-network

volumes:
  data:

networks:
  registry-radar-network:
    driver: bridge
    name: registry-radar-network
```

2. **Start Registry Radar:**
```bash
docker-compose up -d
```

3. **Open your browser:**
Go to `http://localhost:3001` and you'll see the Registry Radar interface.

That's it! Registry Radar is now running and ready to monitor images for you!

### 🔐 Default Login Credentials

**First Time Setup:**
- **Username:** `user`
- **Password:** `password`

⚠️ **Important Security Note:** You will be required to change these default credentials on your first login. The system will prompt you to create a new username and password that are more secure.

**After First Login:**
- Use your new credentials to access Registry Radar
- You can change your credentials anytime in Settings → Authentication

### Option 2: Using Docker CLI

If you prefer to use Docker commands directly:

```bash
# Create named volume
docker volume create data

# Create custom network
docker network create registry-radar-network

# Run apprise container
docker run -d \
  --name apprise \
  --restart unless-stopped \
  --network registry-radar-network \
  -p 8000:8000 \
  -e APPRISE_ALLOW_HOSTS=registry-radar \
  caronc/apprise:latest

# Run registry-radar container
docker run -d \
  --name registry-radar \
  --restart unless-stopped \
  --network registry-radar-network \
  -p 3001:3001 \
  -v data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e APPRISE_URL=http://apprise:8000 \
  -e REGISTRY_RADAR_URL=https://registry-radar.your-domain.com or http://IP:PORT \
  ghcr.io/andrewbusbee/registry-radar:0.1.0-beta.8

```

Then open `http://localhost:3001` in your browser.

⚠️ **Security Note:**
Registry Radar doesn't have built-in user authentication yet. If you're planning to use it in a production environment where others might access it, consider:
- Using a reverse proxy with authentication (like nginx with basic auth)
- Restricting network access with a firewall
- Running it on a private network or VPN

## How to Use Registry Radar

Once Registry Radar is running, you can start adding images to monitor. The web interface makes this easy - just click "Add Image" and fill in the details or paste in a list of conatiners to monitor.

### Setting Up Automatic Checks

Registry Radar can automatically check for updates on a schedule. By default, it checks daily at 9 AM, but you can change this:

- **Through the Web Interface**: Go to Settings → Cron Configuration

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

Registry Radar can send you notifications when updated images are found or errors occur. You can configure multiple notification types to stay informed about your Docker images.

### Available Notification Types
#### 🔔 **Apprise Notifications**
Send notifications to 80+ services including Discord, Slack, Email, SMS, Pushover, and many more. Apprise provides a unified interface for all your notification needs.

**Setup:**
1. Go to Settings → Notifications in the web interface
2. Enable Apprise notifications
3. Add notification channels using Apprise URLs
4. Test your configuration

**Supported Services Include:**
- **Discord**: `discord://webhook_id/webhook_token`
- **Slack**: `slack://token_a/token_b/token_c`
- **Email**: `mailto://user:pass@domain.com`
- **Pushover**: `pover://user@token`
- **SMS**: `twilio://account_sid/token/from_phone/to_phone`
- **Telegram**: `tgram://bot_token/chat_id`
- And 75+ more services!

**Examples:**
```
# Discord webhook
discord://webhook_id/webhook_token

# Gmail SMTP
mailto://gmail_user:app_password@gmail.com

# Slack webhook
slack://T1H9RESGL/B1H9RESGL/aHJ4f26tDls6yJh7D1p2F4f3
```

### Testing Your Notifications

After setting up notifications, you can test them:
- **Apprise**: Click "Send Test Notification" in the notification settings

### Environment Variables

You can customize Registry Radar with these environment variables:
- `PORT` - The port to run on (default: 3001)
- `NODE_ENV` - Set to 'development' or 'production'
- `DOCKERHUB_USERNAME` - Your Docker Hub username (optional, increases rate limits)
- `DOCKERHUB_PASSWORD` - Your Docker Hub password/token (optional)

## Troubleshooting

### Common Issues

**Registry Radar won't start:**
- Check if port 3001 is already in use: `docker ps` or `netstat -tulpn | grep 3001`
- Make sure Docker is running: `docker --version`

**Can't access the web interface:**
- Verify the container is running: `docker-compose ps`
- Check the logs: `docker-compose logs registry-radar`
- Try accessing `http://localhost:3001` (not https)

**Image checks are failing:**
- Check your internet connection
- Verify image names and tags are correct
- For GitHub images, make sure you've specified the namespace

### Getting Help

If you run into issues:
1. Check the Registy Radar container logs: `docker-compose logs registry-radar`
2. Look at the web interface - it often shows helpful error messages
3. Create an issue on GitHub with your error details

---

## License

MIT License - see LICENSE file for details.

## 🤖 AI-Assisted Development

This project was built with the support of modern **AI coding tools** to accelerate prototyping and implementation.  
- AI was used to generate scaffolding, boilerplate, and draft functions.  
- All code has been **curated, reviewed, and tested** by a human before release.  
- The use of AI allowed for faster iteration and a focus on architecture, usability, and overall project quality.  

Community contributions and reviews are encouraged to further strengthen and expand the project.  

