#!/bin/bash

echo "🚀 Starting Backend & Testing Email..."
echo ""

# Kill any existing processes
pkill -9 node 2>/dev/null
pkill -9 tsx 2>/dev/null
sleep 1

# Start backend in background
cd "/Users/bohdantkachenko/Development/Project Reservations App/backend"
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 5

# Test if backend is running
if lsof -ti:3002 > /dev/null; then
    echo "✅ Backend is running on port 3002"
    echo ""
    
    # Create test reservation
    echo "📧 Creating test reservation..."
    curl -X POST http://localhost:3002/api/reservations \
      -H "Content-Type: application/json" \
      -d '{
        "guestName": "Bohdan Mailtrap Test",
        "email": "tech.bohdan@gmail.com",
        "phone": "15551234567",
        "date": "2026-01-01",
        "time": "19:00",
        "partySize": 2,
        "notes": "Testing Mailtrap integration!",
        "source": "WEB"
      }' | jq .
    
    echo ""
    echo "📋 Backend logs (last 20 lines):"
    tail -20 /tmp/backend.log | grep -A 5 "EMAIL"
    
    echo ""
    echo "✅ Check your Mailtrap inbox: https://mailtrap.io/inboxes"
    echo ""
    echo "To stop backend: kill $BACKEND_PID"
else
    echo "❌ Backend failed to start"
    echo "Check logs: tail /tmp/backend.log"
fi
