@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo Installing Node dependencies...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
call npm start
if errorlevel 1 pause
