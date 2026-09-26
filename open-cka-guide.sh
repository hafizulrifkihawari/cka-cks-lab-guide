#!/bin/bash

cd "$(dirname "$0")" || exit 1

# Stop the server when this script exits
cleanup() {
    echo ""
    echo "Stopping CKA study guide server..."
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
    echo "Server stopped."
}

trap cleanup EXIT INT TERM

echo "Starting CKA study guide server..."
python3 -m http.server 8000 &
SERVER_PID=$!

sleep 1

open -a "Brave Browser" "http://localhost:8000/cka-study-guide.html"

echo ""
echo "CKA Study Guide: http://localhost:8000/cka-study-guide.html"
echo "Server PID: $SERVER_PID"
echo ""
echo "Keep this terminal open."
echo "Press Ctrl+C or close the terminal to stop the server."

# Keep this script running
wait "$SERVER_PID"
