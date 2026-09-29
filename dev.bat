@echo off
cd /d "%~dp0"
echo Starting Furnituras Iznemsanas Station (Development)...

if not exist .venv\Scripts\activate.bat (
    echo Virtual environment not found. Please run setup.bat first.
    pause
    exit /b 1
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo Starting application...
echo Opening browser in 2 seconds...
REM start "" cmd /c "timeout /t 2 >nul && start http://127.0.0.1:8000"
REM path uz chrome ieteicams
timeout /t 2 >nul
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window http://127.0.0.1:8000
python main.py
