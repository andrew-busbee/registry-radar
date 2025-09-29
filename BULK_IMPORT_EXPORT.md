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

The bulk import supports various container registry formats:

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

## How to Use

### Import Containers
1. Click **"Import List"** button on the Containers page
2. Paste your container list in the textarea
3. Click **"Parse & Preview"** to validate
4. Review the preview and click **"Import X Containers"**
5. Success! Containers are added to your list

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

## Error Handling

The system provides detailed error messages for:
- Invalid image paths
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

