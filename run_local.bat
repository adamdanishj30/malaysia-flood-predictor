@echo off
title Malaysia Flood Predictor - Local Server
echo ========================================================
echo   Starting Malaysia Flood Prediction Local Server...
echo ========================================================
echo.
echo Opening browser at http://localhost:8000
echo (Keep this window open while using the app)
echo Press Ctrl+C to stop.
echo.

start http://localhost:8000
"C:\Users\adamd\AppData\Local\Programs\Python\Python314\python.exe" -m http.server 8000
pause
