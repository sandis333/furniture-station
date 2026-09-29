#!/bin/bash
echo "Setting up Furnituras Iznemsanas Station..."
echo

echo "Creating virtual environment..."
if [ ! -d ".venv" ]; then
    python -m venv .venv
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt
echo

echo "Setup complete! Use dev.sh for fast startup."
