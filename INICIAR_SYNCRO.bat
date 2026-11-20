@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ===========================================
echo    SYNCRO 2.0 - Prototipo academico local
 echo ===========================================
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PYTHON=py -3"
) else (
    set "PYTHON=python"
)
%PYTHON% -c "import openpyxl" >nul 2>nul
if errorlevel 1 (
    echo Instalando dependencia de lectura Excel...
    %PYTHON% -m pip install -r requirements.txt
    if errorlevel 1 (
       echo ERROR: se necesita Python 3.10+ y openpyxl.
       pause
       exit /b 1
    )
)
echo Abre http://127.0.0.1:8765 en Chrome, Edge o Firefox.
start "" "http://127.0.0.1:8765"
%PYTHON% server.py
pause
