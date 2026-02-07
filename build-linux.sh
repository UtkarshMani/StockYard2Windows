#!/bin/bash

# Build script for Linux Inventory Management System

set -e

echo "=========================================="
echo "Building Inventory Management System"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if node_modules exists in root
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Installing root dependencies...${NC}"
    npm install
fi

# Step 1: Build Backend
echo -e "${GREEN}✓ Step 1: Building Backend...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  Installing backend dependencies...${NC}"
    npm install
fi
npm run build
npx prisma generate
cd ..

# Step 2: Build Frontend
echo -e "${GREEN}✓ Step 2: Building Frontend...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  Installing frontend dependencies...${NC}"
    npm install
fi
npm run build
cd ..

# Step 3: Create distributable
echo -e "${GREEN}✓ Step 3: Creating Linux Application...${NC}"
npx electron-builder --linux --x64

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Build Complete!${NC}"
echo "=========================================="
echo ""
echo "Your application is ready in the 'dist' folder:"
echo "  - AppImage: dist/Inventory Management System-*.AppImage"
echo "  - For installation: chmod +x and double-click to run"
echo ""
echo "To install system-wide, you can:"
echo "  1. Run the .AppImage file directly"
echo "  2. Or move it to ~/.local/bin/"
echo ""
