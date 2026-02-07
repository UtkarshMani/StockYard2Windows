#!/bin/bash

# GitHub Push Script
# This script initializes git, commits all files, and pushes to GitHub

cd "/home/utkarsh-mani/Documents/PIE/Inventory Management"

echo "=== StockYard GitHub Push Script ==="
echo ""

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
else
    echo "Git already initialized"
fi

# Configure git user if not set
if [ -z "$(git config user.name)" ]; then
    echo "Setting git user name..."
    git config user.name "UtkarshMani"
fi

if [ -z "$(git config user.email)" ]; then
    echo "Setting git user email (please enter your GitHub email):"
    read email
    git config user.email "$email"
fi

# Add all files
echo "Adding files to Git..."
git add .

# Commit
echo "Committing files..."
git commit -m "Initial commit: StockYard Inventory Management System

- Electron desktop application with Express backend and Next.js frontend
- EAV-based flexible product data model  
- SQLite database with Prisma ORM
- Inventory tracking with ATP (Available To Promise)
- Purchase orders, stock management, and gatepass system
- Multi-user support with role-based permissions
- Docker support and Linux .deb packaging"

# Add remote (GitHub repository)
echo ""
echo "Adding GitHub remote..."
git remote add origin https://github.com/UtkarshMani/StockYard.git 2>/dev/null || echo "Remote already exists"

# Push to GitHub
echo ""
echo "Pushing to GitHub..."
echo "You may need to enter your GitHub Personal Access Token"
git push -u origin main || git push -u origin master

echo ""
echo "=== Done! ==="
echo "Repository URL: https://github.com/UtkarshMani/StockYard"
