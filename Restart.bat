@echo off
cd /d "%~dp0"
python Restart.py
exit /b %errorlevel%
