@echo off
echo Starting Chess Game Development Environment...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd apps\server && npm start"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd apps\web && npm run dev"

echo.
echo Both servers are starting up...
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window...
pause > nul

