@echo off
chcp 65001 >nul
echo ========================================
echo   FUEL DASHBOARD - Modern UI
echo ========================================
echo.
echo Dashboard sẽ mở tại: http://localhost:3000
echo.

cd /d "%~dp0\ui"

REM Check if .env.local exists
if not exist ".env.local" (
    echo [WARNING] File .env.local chưa tồn tại!
    echo Đang tạo từ template...
    echo.
    (
        echo DB_HOST=localhost
        echo DB_USER=root
        echo DB_PASSWORD=minhtrung02
        echo DB_NAME=petrolimex
        echo DB_PORT=3306
    ) > .env.local
    echo ✓ Đã tạo .env.local
    echo ➜ Hãy kiểm tra và cập nhật thông tin MySQL trong file này
    echo.
    pause
)

echo Đang khởi động dashboard...
npm run dev

pause
