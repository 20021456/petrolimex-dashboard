@echo off
chcp 65001 > nul
echo ============================================================
echo   CAI DAT FUEL DATA SCRAPER + INVENTORY
echo ============================================================
echo.

REM Kiem tra Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Chua cai Python!
    echo     Tai Python: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Dang cai dat thu vien Python...
pip install playwright beautifulsoup4 pandas lxml mysql-connector-python

if %errorlevel% neq 0 (
    echo.
    echo [X] Loi khi cai thu vien!
    pause
    exit /b 1
)

echo.
echo [2/3] Dang cai dat Playwright browsers...
python -m playwright install chromium

if %errorlevel% neq 0 (
    echo.
    echo [X] Loi khi cai Playwright!
    pause
    exit /b 1
)

echo.
echo [3/3] Dang tao bang Inventory trong MySQL...
python src\load\setup_tables.py

echo.
echo ============================================================
echo   CAI DAT THANH CONG!
echo ============================================================
echo.
echo Buoc tiep theo:
echo 1. Chinh sua src\utils\config.py (MySQL password)
echo 2. Tao file ui\.env.local (xem README.md)
echo 3. Chay "run_dashboard.bat" de khoi dong dashboard
echo.
pause
