#!/bin/bash

# Build script for Islands of Bharath project

echo "🚀 Building Islands of Bharath project..."

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip install -r requirements.txt

# Create production build directory
echo "📁 Creating production build..."
mkdir -p dist

# Copy static files
echo "📋 Copying static files..."
cp -r public/* dist/
cp -r static/* dist/
cp -r templates/* dist/

# Copy server files
echo "🔧 Copying server files..."
cp server.js dist/
cp package.json dist/
cp requirements.txt dist/

echo "✅ Build complete! Project ready for deployment."
echo "📁 Build files are in the 'dist' directory." 