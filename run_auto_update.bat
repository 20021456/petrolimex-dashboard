@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
echo ========================================
echo   FUEL AUTO UPDATE
echo ========================================
echo.
echo   Chon mode:
echo   1. Auto-update (chi lay du lieu moi) [Mac dinh]
echo   2. Reload tu cuoi thang 8/2025
echo   3. Reload N ngay gan nhat
echo.
echo ========================================
echo.

set /p choice="Nhap lua chon (1-3, Enter = 1): "

cd /d "%~dp0"

if "%choice%"=="2" (
    echo.
    echo Mode 2: RELOAD tu thang 8/2025
    python scripts\demo_auto_update.py --mode 2
) else if "%choice%"=="3" (
    echo.
    set /p days="Nhap so ngay (mac dinh 90): "
    if "!days!"=="" set days=90
    echo.
    echo Mode 3: RELOAD !days! ngay gan nhat
    python scripts\demo_auto_update.py --mode 3 --days !days!
) else (
    echo.
    echo Mode 1: AUTO-UPDATE (mac dinh)
    python scripts\demo_auto_update.py --mode 1
)

echo.
endlocal
pause
