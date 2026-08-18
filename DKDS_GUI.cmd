@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows\dkds-gui.ps1"
exit /b %errorlevel%
