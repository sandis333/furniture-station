@echo off
echo Setting up Furnituras Iznemsanas Station...
echo.

echo Creating virtual environment...
if not exist .venv (
    python -m venv .venv
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt
echo.

echo Setup complete! Use dev.bat for fast startup.
pause
