#!/bin/bash
# setup.sh - Script to set up the development environment

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed."
  echo "Please install Node.js v20.18.0 or later."
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
echo "Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "Error: npm is not installed."
  echo "Please install npm (usually comes with Node.js)."
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building the project..."
npm run build

# Check if .env file exists, create from example if not
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update the .env file with your actual secrets."
fi

echo "Environment setup complete!"
echo "To start development, run: npm run dev"
