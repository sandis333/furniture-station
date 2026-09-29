#!/bin/bash
echo "Restarting Furnituras Iznemsanas Station..."

if [ ! -f ".venv/bin/activate" ]; then
    echo "Virtual environment not found. Please run setup.sh first."
    exit 1
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Cleaning up old processes..."
python Restart.py
