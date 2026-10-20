@echo off
title Push to GitHub - Malaysia Flood Predictor
echo ========================================================
echo   Updating GitHub repository to your profile...
echo   Author: adamdanishj30
echo ========================================================
echo.
cd /d "%~dp0\.."
git push origin main
echo.
echo ========================================================
echo Done! Refresh your GitHub repository page.
echo The other person's profile is now replaced with yours!
echo ========================================================
pause
