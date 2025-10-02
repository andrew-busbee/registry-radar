# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install build dependencies for sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY index.html ./

# Build the application
RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

# Install build dependencies for sqlite3 compilation
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Remove build dependencies to reduce image size
RUN apk del python3 make g++ sqlite-dev

# Install runtime SQLite library
RUN apk add --no-cache sqlite

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S registry-radar -u 1001

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Set proper ownership and permissions
RUN chown -R registry-radar:nodejs /app
RUN chmod -R 755 /app/data
USER registry-radar

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/cron/status', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
