#!/bin/bash

# StockYard Desktop Launcher
# Starts the application in development mode (dev servers + Electron)

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=5000
FRONTEND_PORT=3000

echo "=== StockYard Desktop (Dev Mode) ==="
cd "$PROJECT_ROOT"

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down StockYard..."
    
    # Kill background processes started by this script
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null
        wait "$BACKEND_PID" 2>/dev/null
        echo "✓ Backend stopped"
    fi
    
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null
        wait "$FRONTEND_PID" 2>/dev/null
        echo "✓ Frontend stopped"
    fi
    
    # Also kill anything still on the ports we started
    lsof -ti:$BACKEND_PORT 2>/dev/null | xargs kill 2>/dev/null
    lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill 2>/dev/null
    
    echo "Goodbye!"
    exit 0
}

trap cleanup EXIT INT TERM

# Check if port is in use
check_port() {
    lsof -ti:$1 >/dev/null 2>&1
}

# Wait for server to become ready
wait_for_server() {
    local port=$1
    local name=$2
    local max=30
    local i=0
    
    while [ $i -lt $max ]; do
        if curl -s "http://localhost:$port" >/dev/null 2>&1; then
            echo "✓ $name ready on port $port"
            return 0
        fi
        i=$((i + 1))
        sleep 1
    done
    
    echo "✗ $name failed to start on port $port"
    return 1
}

# --- Start Backend ---
if check_port $BACKEND_PORT; then
    echo "✓ Backend already running on port $BACKEND_PORT"
else
    echo "Starting backend..."
    cd "$PROJECT_ROOT/backend"
    npm run dev > /tmp/stockyard-backend.log 2>&1 &
    BACKEND_PID=$!
    cd "$PROJECT_ROOT"
    
    if ! wait_for_server $BACKEND_PORT "Backend"; then
        echo "ERROR: Backend failed. Check /tmp/stockyard-backend.log"
        cat /tmp/stockyard-backend.log | tail -20
        exit 1
    fi
fi

# --- Start Frontend ---
if check_port $FRONTEND_PORT; then
    echo "✓ Frontend already running on port $FRONTEND_PORT"
else
    echo "Starting frontend..."
    cd "$PROJECT_ROOT/frontend"
    npm run dev > /tmp/stockyard-frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd "$PROJECT_ROOT"
    
    if ! wait_for_server $FRONTEND_PORT "Frontend"; then
        echo "ERROR: Frontend failed. Check /tmp/stockyard-frontend.log"
        cat /tmp/stockyard-frontend.log | tail -20
        exit 1
    fi
fi

# --- Launch Electron in dev mode ---
# Using npx electron . ensures isDev=true and USE_EXISTING_SERVERS=true
# so it connects to the dev servers we just started instead of spawning its own
echo "Launching StockYard Electron app..."
npx electron .
