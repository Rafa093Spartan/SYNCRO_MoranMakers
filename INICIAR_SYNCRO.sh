#!/bin/sh
set -e
cd "$(dirname "$0")"
python3 -c 'import openpyxl' 2>/dev/null || python3 -m pip install -r requirements.txt
printf '\nSYNCRO: abre http://127.0.0.1:8765 en el navegador\n'
python3 server.py
