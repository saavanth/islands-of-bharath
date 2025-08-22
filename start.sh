#!/bin/bash

echo "🚀 Starting Islands of Bharath - Complete Setup"
echo "================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Check if Streamlit is installed
if ! command -v streamlit &> /dev/null; then
    echo "📦 Installing Streamlit..."
    pip3 install streamlit plotly pandas
fi

echo "✅ Dependencies checked!"

# Start the Node.js server (which will also start Streamlit)
echo "🌐 Starting Node.js server with integrated dashboard..."
echo "📊 Dashboard will be available at: http://localhost:5502/dashboard"
echo "🏠 Main website will be available at: http://localhost:5502"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

node server.js 