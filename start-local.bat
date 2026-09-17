@echo off
title BSE Portal Launcher
echo ===================================================
echo   Starting BSE API Simulator & Internal Portal
echo ===================================================

echo [1/3] Starting Mock BSE API on port 4000...
start "Mock BSE API (:4000)" cmd /k "cd mock-bse-api && npm start"

echo [2/3] Starting Portal Backend on port 3001...
start "Portal Backend (:3001)" cmd /k "cd portal-backend && npm start"

echo [3/3] Starting Portal Frontend on port 5173...
start "Portal Frontend (:5173)" cmd /k "cd portal-frontend && npm run dev"

echo.
echo All 3 services are launching!
echo Opening http://localhost:5173 in browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173
echo ===================================================
echo Done! Keep the terminal windows open while testing.
echo ===================================================
