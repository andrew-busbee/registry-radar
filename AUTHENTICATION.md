# Authentication Setup

Registry Radar now includes a simple authentication system with the following features:

## Features

- **Single User Authentication**: One user account with configurable username/password
- **JWT Token-based**: Secure authentication using JSON Web Tokens
- **Cookie-based Sessions**: Tokens stored in HTTP-only cookies for security
- **First Login Password Change**: Users must change default credentials on first login
- **Remember Me**: Optional 30-day token expiration (default is 7 days)
- **No Database Required**: User credentials stored in encrypted JSON file

## Default Credentials

- **Username**: `user`
- **Password**: `password`

⚠️ **Important**: Change these credentials immediately after first login!

## How It Works

1. **First Launch**: The system creates a default user with hashed password
2. **Login**: Users authenticate with username/password
3. **First Login**: Users are required to change both username and password
4. **Session Management**: JWT tokens are stored in HTTP-only cookies
5. **API Protection**: All API endpoints require valid authentication

## Configuration

### Environment Variables

Set the following environment variable for production:

```bash
JWT_SECRET=your-super-secret-jwt-key-here
```

### User Configuration

User credentials are stored in `data/user.json` (created automatically):

```json
{
  "username": "user",
  "passwordHash": "$2a$12$...",
  "isFirstLogin": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **HTTP-Only Cookies**: Prevents XSS attacks
- **Secure Cookies**: HTTPS-only in production
- **Token Expiration**: Configurable expiration times
- **CORS Protection**: Credentials required for API calls

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password (first login)
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/verify` - Verify authentication status

## Development

The authentication system is fully integrated and requires no additional setup. Simply run the application and use the default credentials to log in.

## Production Deployment

1. Set a strong `JWT_SECRET` environment variable
2. Ensure HTTPS is enabled for secure cookie transmission
3. The user configuration file will be created automatically on first run

