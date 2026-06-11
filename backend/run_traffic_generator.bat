@echo off
echo Running USCIS Sandbox Traffic Generator...
echo.

cd /d "%~dp0"
py sandbox_traffic_generator.py

echo.
echo Complete! You can close this window now.
pause
