#!/bin/bash

# Test script for create-vibe-overlord CLI
echo "🧪 Testing create-vibe-overlord CLI"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this from the cli directory"
    exit 1
fi

# Build the CLI
echo "🔨 Building CLI..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed"
    exit 1
fi

# Test the CLI help
echo ""
echo "📋 CLI Help:"
echo "============"
node dist/index.js --help

echo ""
echo "🎉 CLI is ready to use!"
echo ""
echo "To test locally:"
echo "1. cd to a Next.js project"
echo "2. Run: node /path/to/ui-overlord/cli/dist/index.js add"
echo ""
echo "To install globally:"
echo "1. npm link (from cli directory)"
echo "2. create-vibe-overlord add (from any project)" 