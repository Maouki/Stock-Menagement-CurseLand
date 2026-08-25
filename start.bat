@echo off
title ระบบจัดการสต๊อกสินค้า
echo.
echo  ===================================
echo   ระบบจัดการสต๊อกสินค้า ปาร์คอิน
echo  ===================================
echo.
echo  กำลังเริ่มต้นระบบ...
echo  เปิดเบราว์เซอร์ที่: http://localhost:5000
echo.
echo  กด Ctrl+C เพื่อปิดระบบ
echo.
cd /d "%~dp0"
start "" "http://localhost:5000"
python app.py
pause
