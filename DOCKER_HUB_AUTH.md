# Docker Hub Authentication Setup

Registry Radar now supports Docker Hub authentication to increase your rate limits and avoid rate limiting errors.

## Rate Limits

| Account Type | Pull Limit | 
|--------------|------------|
| Anonymous (no auth) | 100 pulls/6 hours |
| Free Account (authenticated) | 200 pulls/6 hours |
| Pro/Team Account | Unlimited pulls |

## Setup Methods

### Option 1: Using Docker Compose (Recommended)

Edit your `docker-compose.yml` and add your credentials:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3001
  - DOCKERHUB_USERNAME=your_username
  - DOCKERHUB_PASSWORD=your_password_or_token
```

Then restart the container:
```bash
docker-compose down
docker-compose up -d
```

### Option 2: Using .env File

Create a `.env` file in your project root:

```env
DOCKERHUB_USERNAME=your_username
DOCKERHUB_PASSWORD=your_password_or_token
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Option 3: Using Personal Access Token (More Secure)

Instead of using your password, you can create a Personal Access Token:

1. Go to https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Give it a name (e.g., "Registry Radar")
4. Copy the token
5. Use the token as your `DOCKERHUB_PASSWORD`

```yaml
environment:
  - DOCKERHUB_USERNAME=your_username
  - DOCKERHUB_PASSWORD=dckr_pat_xxxxxxxxxxxxxxxxxxxx
```

## Verification

### Check Logs at Startup

After starting Registry Radar, check the logs:

```bash
docker logs registry-radar
```

**With authentication configured:**
```
🚀 Registry Radar server running on port 3001
📱 Open http://localhost:3001 to view the application
🔐 Docker Hub: Authenticated as "your_username" (200 pulls/6hr or unlimited if Pro)
```

**Without authentication:**
```
🚀 Registry Radar server running on port 3001
📱 Open http://localhost:3001 to view the application
⚠️  Docker Hub: Anonymous mode (100 pulls/6hr) - Add DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD to increase limit
```

### Check Logs During Image Checks

When checking images, you'll see:

```
[Registry] Token request (authenticated) { realm: 'https://auth.docker.io/token', service: 'registry.docker.io' }
[Registry] Token response { status: 200, hasToken: true, authenticated: true, rateLimit: '198/200' }
```

Key indicators:
- `(authenticated)` in token request
- `authenticated: true` in token response
- `rateLimit: '198/200'` shows you have 200 pull limit (vs 100 for anonymous)

## Troubleshooting

### Invalid Credentials

If you see this error:
```
[Registry] Token request failed { status: 401, data: {...} }
```

**Solutions:**
1. Double-check your username and password
2. If using 2FA, you MUST use a Personal Access Token (not password)
3. Make sure there are no extra spaces in your credentials

### Still Getting Rate Limited

If you're still hitting rate limits with authentication:

1. **Verify authentication is working** - Check logs for `authenticated: true`
2. **Check your account type** - Free accounts have 200/6hr limit
3. **Consider Docker Hub Pro** - $7/month for unlimited pulls
4. **Reduce check frequency** - Edit cron schedule in Settings

## Support

If you encounter issues:
1. Check the logs: `docker logs -f registry-radar`
2. Verify credentials work: `docker login -u your_username -p your_password`
3. Check rate limit status in token response logs

