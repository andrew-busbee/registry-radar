@echo off
echo 🚀 Setting up Registry Radar...

REM Create data directory if it doesn't exist
if not exist "data" (
    echo 📁 Creating data directory...
    mkdir data
)

REM Copy example files if they don't exist
if not exist "data\containers.yml" (
    echo 📝 Creating containers.yml from example...
    copy "data\containers.yml.example" "data\containers.yml"
)

if not exist "data\cron.yml" (
    echo ⏰ Creating cron.yml from example...
    copy "data\cron.yml.example" "data\cron.yml"
)

if not exist "data\state.json" (
    echo 💾 Creating state.json...
    echo [] > "data\state.json"
)

if not exist "data\notifications.json" (
    echo 🔔 Creating notifications.json...
    echo [] > "data\notifications.json"
)

echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Edit data\containers.yml to add your containers
echo 2. Run: docker-compose up -d
echo 3. Open: http://localhost:3001
echo.
echo Or for development:
echo 1. Run: npm install
echo 2. Run: npm run dev
pause
