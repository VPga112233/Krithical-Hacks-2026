#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=========================================================="
echo "  VouchAI Turbo - Automated Setup & Launcher for Judges"
echo "=========================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Please install Node.js (v18+) from https://nodejs.org/"
    exit 1
fi

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "[1/3] First-time setup: Installing dependencies..."
    npm install
else
    echo "[1/3] Dependencies verified."
fi

# Open browser
echo "[2/3] Launching web browser..."
sleep 1
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" &
elif command -v open &> /dev/null; then
    open "http://localhost:3000" &
fi

echo "[3/3] Starting high-speed backend server..."
echo ""
node server.js
