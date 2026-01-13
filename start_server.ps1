# PowerShell启动脚本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  快乐小严腰痛处方生成器 - 本地服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "正在启动本地服务器..." -ForegroundColor Yellow
Write-Host ""

# 检查Python是否安装
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Python未安装"
    }
    Write-Host "[信息] Python已安装 ($pythonVersion)" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未检测到Python！" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装Python:" -ForegroundColor Yellow
    Write-Host "1. 访问 https://www.python.org/downloads/"
    Write-Host "2. 下载并安装Python 3.x"
    Write-Host "3. 安装时勾选 'Add Python to PATH'"
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}

Write-Host "[信息] 服务器地址: http://localhost:8000" -ForegroundColor Green
Write-Host "[信息] 按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动Python HTTP服务器
try {
    python -m http.server 8000
} catch {
    Write-Host ""
    Write-Host "[错误] 服务器启动失败！" -ForegroundColor Red
    Write-Host "可能的原因："
    Write-Host "1. 端口8000已被占用"
    Write-Host "2. Python版本过低（需要Python 3.x）"
    Write-Host ""
    Read-Host "按回车键退出"
}
