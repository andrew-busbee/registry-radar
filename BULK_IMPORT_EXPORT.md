# Bulk Import & Export Feature

Registry Radar now includes bulk import and export functionality for managing multiple containers at once.

## Features

### 🔄 **Bulk Import**
- **Paste & Parse**: Paste a list of container images and automatically parse them
- **Preview Mode**: See what will be imported before confirming
- **Validation**: Automatic validation with error highlighting
- **Duplicate Detection**: Prevents importing containers that already exist
- **Error Handling**: Detailed error messages for failed imports

### 📤 **Export**
- **One-Click Export**: Download current containers as a text file
- **Standard Format**: Exports in the same format as import expects
- **Easy Sharing**: Share container lists with others

## Supported Formats

The bulk import now supports **smart parsing** of multiple content types:

### 📋 **Simple Text List**
```
# GitHub Container Registry
ghcr.io/hotio/sonarr
ghcr.io/hotio/radarr

# LinuxServer Container Registry  
lscr.io/linuxserver/sabnzbd
lscr.io/linuxserver/mylar3

# Docker Hub (default)
nginx:alpine
redis:7
linuxserver/ffmpeg

# Custom registries
your-registry.com/namespace/image:tag
```

### 🐳 **Docker Compose Files**
```yaml
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      
  redis:
    image: redis:7-alpine
```

### ⚡ **Docker Commands**
```bash
docker run -d --name web nginx:alpine
docker run -d --name db postgres:15
podman run -it --rm redis:7
```

### 📄 **Dockerfile FROM Statements**
```dockerfile
FROM nginx:alpine
FROM --platform=linux/amd64 postgres:15
FROM ghcr.io/user/repo:latest AS builder
```

## How to Use

### Import Containers
1. Click **"Import List"** button on the Containers page
2. Paste your content (any supported format) in the textarea
3. Click **"Parse & Preview"** to validate and see detected content type
4. Review the preview showing parsed containers with source information
5. Click **"Import X Containers"** to add them to your list
6. Success! Containers are added to your list

### Export Containers
1. Click **"Export"** button on the Containers page
2. A `containers.txt` file will be downloaded
3. Share this file or use it for backup

## Example Import List

```
ghcr.io/hotio/sonarr
lscr.io/linuxserver/sabnzbd
ghcr.io/hotio/radarr
ghcr.io/hotio/bazarr
linuxserver/ffmpeg
lscr.io/linuxserver/mylar3
lscr.io/linuxserver/prowlarr
nginx:alpine
redis:7
postgres:15
```

## Enhanced Features

### ✨ **Smart Content Detection**
- Automatically detects Docker Compose, Docker commands, Dockerfiles, or plain text
- Shows content type in the preview with appropriate icons
- Handles mixed content types intelligently

### 🔍 **Advanced Validation**
- Comprehensive image path validation with specific error messages
- Registry domain validation for known registries
- Tag format validation
- Handles image digests (converts to latest tag for monitoring)
- Filters out invalid content automatically

### 📊 **Enhanced Preview**
- Shows source of each parsed container (Compose, Command, Dockerfile, Text)
- Displays original lines for context
- Color-coded validation status
- Detailed error messages with suggestions

## Error Handling

The system provides detailed error messages for:
- Invalid image paths (specific validation errors)
- Invalid tag formats
- Invalid registry domains
- Missing required fields
- Duplicate containers
- Network errors
- Server validation errors

## API Endpoints

- `POST /api/config/containers/bulk` - Bulk import containers
- `GET /api/config/containers/export` - Export containers as text file

## Technical Details

- **Parsing**: Handles various registry formats automatically
- **Validation**: Client and server-side validation
- **Progress**: Real-time feedback during import
- **Security**: All requests require authentication
- **Performance**: Efficient batch processing

