#!/bin/bash

echo "========================================"
echo "  快乐小严腰痛处方生成器 - 本地服务器"
echo "========================================"
echo ""
echo "正在启动本地服务器..."
echo ""

# 检查Python是否安装
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[错误] 未检测到Python！"
    echo ""
    echo "请先安装Python:"
    echo "  Ubuntu/Debian: sudo apt-get install python3"
    echo "  CentOS/RHEL:   sudo yum install python3"
    echo "  macOS:         brew install python3"
    echo ""
    exit 1
fi

# 优先使用python3，如果没有则使用python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

echo "[信息] Python已安装 ($($PYTHON_CMD --version))"
echo "[信息] 服务器地址: http://localhost:8000"
echo "[信息] 按 Ctrl+C 停止服务器"
echo ""
echo "========================================"
echo ""

# 启动Python HTTP服务器
$PYTHON_CMD -m http.server 8000

if [ $? -ne 0 ]; then
    echo ""
    echo "[错误] 服务器启动失败！"
    echo "可能的原因："
    echo "1. 端口8000已被占用"
    echo "2. Python版本过低（需要Python 3.x）"
    echo ""
    read -p "按回车键退出..."
fi
