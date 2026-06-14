#!/bin/bash
set -e

echo "🚀 Starting Splunk AI Query Copilot..."

# Backend
echo "📦 Setting up backend..."
cd backend
[ ! -f .env ] && cp .env.example .env && echo "⚠️  Created .env from example - edit backend/.env with your Splunk credentials"
pip3 install -r requirements.txt -q
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "✅ Backend running on http://localhost:8000"

# Frontend
echo "📦 Setting up frontend..."
cd ../frontend
npm install -q
REACT_APP_API_URL=http://localhost:8000 npm start &
FRONTEND_PID=$!
echo "✅ Frontend running on http://localhost:3000"

echo ""
echo "🎉 Splunk AI Query Copilot is ready!"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"

wait $BACKEND_PID $FRONTEND_PID
