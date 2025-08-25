#!/bin/bash

# Deploy script for GitHub Pages
# Usage: ./deploy.sh [commit-message]

set -e  # Exit on any error

echo "🚀 Deploying to GitHub Pages..."

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Working directory has uncommitted changes."
    echo "   Please commit or stash changes before deploying."
    exit 1
fi

# Get commit message from argument or use default
COMMIT_MSG="${1:-Deploy updates}"

echo "📝 Current commit: $(git rev-parse --short HEAD)"
echo "📦 Building application..."

# Build the application
npm run build

echo "🌐 Deploying to gh-pages branch..."

# Deploy to GitHub Pages
npm run deploy

echo "✅ Deployment complete!"
echo "🔗 Your site will be available at:"
echo "   https://$(git config --get remote.origin.url | sed 's/.*github.com[/:]//g' | sed 's/.git//g' | sed 's/\//.github.io\//g')"
echo ""
echo "⏱️  It may take a few minutes for changes to appear on the live site."