#!/bin/bash
# Railway启动脚本
# 尝试多种Python命令以确保兼容性

echo "正在启动代理服务器..."

# 尝试不同的Python命令
if command -v python3 &> /dev/null; then
    echo "使用 python3 启动..."
    exec python3 railway-proxy.py
elif command -v python &> /dev/null; then
    echo "使用 python 启动..."
    exec python railway-proxy.py
else
    echo "错误: 找不到Python命令"
    echo "可用的命令:"
    which -a python*
    exit 1
fi 