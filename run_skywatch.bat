@echo off
title skyWatch Malaysia - Flood & Weather Dashboard
echo ========================================================
echo   Launching skyWatch Malaysia Glassmorphism Dashboard...
echo ========================================================
echo.
echo Opening browser at http://localhost:8000/skywatch.html
echo (Keep this window open while using the app)
echo Press Ctrl+C to stop.
echo.

start http://localhost:8000/skywatch.html
"C:\Users\adamd\AppData\Local\Programs\Python\Python314\python.exe" -m http.server 8000
pause
