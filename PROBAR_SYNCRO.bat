@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Ejecutando pruebas automatizadas de SYNCRO 2.0...
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  py -3 -m unittest discover -s tests -v
) else (
  python -m unittest discover -s tests -v
)
pause
