#!/bin/bash

echo "🚀 Setting up Registry Radar..."

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p data
fi

# Copy example files if they don't exist
if [ ! -f "data/containers.yml" ]; then
    echo "📝 Creating containers.yml from example..."
    cp data/containers.yml.example data/containers.yml
fi

if [ ! -f "data/cron.yml" ]; then
    echo "⏰ Creating cron.yml from example..."
    cp data/cron.yml.example data/cron.yml
fi

if [ ! -f "data/state.json" ]; then
    echo "💾 Creating state.json..."
    echo "[]" > data/state.json
fi

if [ ! -f "data/notifications.json" ]; then
    echo "🔔 Creating notifications.json..."
    echo "[]" > data/notifications.json
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit data/containers.yml to add your containers"
echo "2. Run: docker-compose up -d"
echo "3. Open: http://localhost:3001"
echo ""
echo "Or for development:"
echo "1. Run: npm install"
echo "2. Run: npm run dev"
