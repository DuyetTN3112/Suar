#!/bin/sh
set -e

echo "🚀 Starting server..."

# Nếu chưa có APP_KEY thì tạo tạm (nhưng nên có trong .env)
if [ -z "$APP_KEY" ]; then
  echo "Generating APP_KEY..."
  export APP_KEY=$(node build/ace.js generate:key)
fi

# Chạy migration database
echo "🔄 Running migrations..."
node build/ace.js migration:run --force

# Khởi động server
echo "✅ Starting AdonisJS..."
exec node build/bin/server.js
