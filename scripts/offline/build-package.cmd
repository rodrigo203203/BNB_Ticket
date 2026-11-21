@echo off
REM Atajo para ejecutar el empaquetado offline desde cmd.exe
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-package.ps1" %*