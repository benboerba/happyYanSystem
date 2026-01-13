@echo off
chcp 65001 >nul
echo ========================================
echo   快乐小严腰痛处方生成器 - 本地服务器
echo ========================================
echo.
echo 正在启动本地服务器...
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python！
    echo.
    echo 请先安装Python:
    echo 1. 访问 https://www.python.org/downloads/
    echo 2. 下载并安装Python 3.x
    echo 3. 安装时勾选 "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo [信息] Python已安装
echo [信息] 服务器地址: http://localhost:8000
echo [信息] 按 Ctrl+C 停止服务器
echo.
echo ========================================
echo.

REM 启动Python HTTP服务器
python -m http.server 8000

if errorlevel 1 (
    echo.
    echo [错误] 服务器启动失败！
    echo 可能的原因：
    echo 1. 端口8000已被占用
    echo 2. Python版本过低（需要Python 3.x）
    echo.
    pause
)
