#!/bin/bash

# Setup rclone for Railway deployment
# This script configures rclone with Google Drive credentials before starting Node.js

echo "🔧 Setting up Rclone for Railway..."

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
    echo "❌ rclone not found. Installing..."
    curl https://rclone.org/install.sh | sudo bash
fi

# Create .config/rclone directory
mkdir -p ~/.config/rclone

# If RCLONE_CONFIG_JSON is set (from Railway secrets), use it
if [ -n "$RCLONE_CONFIG_JSON" ]; then
    echo "📝 Configuring rclone from RCLONE_CONFIG_JSON..."
    echo "$RCLONE_CONFIG_JSON" > ~/.config/rclone/rclone.conf
    chmod 600 ~/.config/rclone/rclone.conf
    echo "✅ rclone.conf created from environment variable"
else
    echo "⚠️  RCLONE_CONFIG_JSON not set"
    echo "Please add your rclone config as a secret in Railway:"
    echo "1. Run: rclone config show"
    echo "2. Copy the output"
    echo "3. Add as RCLONE_CONFIG_JSON secret in Railway dashboard"
fi

# Test rclone connection
echo "🔍 Testing Google Drive connection..."
if rclone ls gdrive:/ &> /dev/null; then
    echo "✅ Google Drive connection successful"
else
    echo "⚠️  Google Drive connection test failed"
    echo "Check your rclone configuration"
fi

echo "✅ Rclone setup complete"
