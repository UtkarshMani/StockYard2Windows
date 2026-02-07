#!/bin/bash

echo "========================================"
echo "Inventory Management System"
echo "Windows Desktop Build Script (Linux/Mac)"
echo "========================================"
echo ""

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

set -e  # Exit on error

echo "[1/6] Installing root dependencies..."
npm install

echo ""
echo "[2/6] Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "[3/6] Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "[4/6] Building backend..."
cd backend
npx prisma generate
npm run build
cd ..

echo ""
echo "[5/6] Building frontend..."
cd frontend
npm run build
cd ..

echo ""
echo "[6/6] Creating Windows installer..."
npx electron-builder --win --x64

echo ""
echo "========================================"
echo "Build completed successfully!"
echo ""
echo "Installer location: dist/"
echo "- Setup: Inventory Management System-1.0.0-Setup.exe"
echo "- Portable: Inventory Management System-1.0.0-Portable.exe"
echo "========================================"
echo ""
