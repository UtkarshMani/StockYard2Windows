#!/bin/bash

# StockYard Launcher - Starts dev servers if needed, then launches Electron app
# This script ensures both backend and frontend are running before opening the UI

PROJECT_ROOT="/home/utkarsh-mani/Documents/PIE/Inventory Management"
BACKEND_PORT=5000
FRONTEND_PORT=3000

echo "=== StockYard Launcher ==="

cd "$PROJECT_ROOT"

# Function to check if port is in use
check_port() {
    lsof -ti:$1 >/dev/null 2>&1
    return $?
}

# Function to wait for server
wait_for_server() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:$port >/dev/null 2>&1; then
            echo "✓ $name is ready on port $port"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    echo "✗ $name failed to start on port $port"
    return 1
}

# Start backend if not running
if ! check_port $BACKEND_PORT; then
    echo "Starting backend server..."
    cd "$PROJECT_ROOT/backend"
    nohup npm run dev > /tmp/stockyard-backend.log 2>&1 &
    echo $! > /tmp/stockyard-backend.pid
    cd "$PROJECT_ROOT"
    
    if ! wait_for_server $BACKEND_PORT "Backend"; then
        echo "Failed to start backend. Check /tmp/stockyard-backend.log"
        exit 1
    fi
else
    echo "✓ Backend already running on port $BACKEND_PORT"
fi

# Start frontend if not running
if ! check_port $FRONTEND_PORT; then
    echo "Starting frontend server..."
    cd "$PROJECT_ROOT/frontend"
    nohup npm run dev > /tmp/stockyard-frontend.log 2>&1 &
    echo $! > /tmp/stockyard-frontend.pid
    cd "$PROJECT_ROOT"
    
    if ! wait_for_server $FRONTEND_PORT "Frontend"; then
        echo "Failed to start frontend. Check /tmp/stockyard-frontend.log"
        exit 1
    fi
else
    echo "✓ Frontend already running on port $FRONTEND_PORT"
fi

# Launch Electron app
echo "Launching StockYard application..."
if [ -x "/opt/StockYard/stockyard" ]; then
    # Use installed version if available
    /opt/StockYard/stockyard
else
    # Fallback to npx electron
    npx electron "$PROJECT_ROOT/electron-main.js"
fi
