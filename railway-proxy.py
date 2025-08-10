#!/usr/bin/env python
"""
Railway部署的代理服务器
解决前端访问后端API的CORS问题
"""

import os
import json
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 后端API地址
BACKEND_URL = "http://3.106.215.122:8080"

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """处理GET请求"""
        try:
            # 解析请求路径
            parsed_path = urlparse(self.path)
            path = parsed_path.path
            
            # 如果是API请求
            if path.startswith('/api/'):
                # 转发到后端
                backend_path = path[4:]  # 去掉 /api 前缀
                backend_url = f"{BACKEND_URL}/{backend_path.lstrip('/')}"
                
                # 添加查询参数
                if parsed_path.query:
                    backend_url += f"?{parsed_path.query}"
                
                print(f"代理请求: {self.path} -> {backend_url}")
                
                # 请求后端
                req = urllib.request.Request(backend_url)
                req.add_header('User-Agent', 'Mozilla/5.0 (compatible; Proxy/1.0)')
                
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    content_type = response.getheader('Content-Type', 'application/json')
                    
                    # 设置CORS头
                    self.send_response(200)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                    self.send_header('Content-Type', content_type)
                    self.end_headers()
                    
                    self.wfile.write(data)
                    return
            
            # 如果是静态文件请求
            else:
                # 设置默认首页
                if path == '/' or path == '':
                    path = '/index.html'
                
                # 构建文件路径
                file_path = f".{path}"
                
                # 检查文件是否存在
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    # 根据文件扩展名设置Content-Type
                    content_type = 'text/html'
                    if file_path.endswith('.css'):
                        content_type = 'text/css'
                    elif file_path.endswith('.js'):
                        content_type = 'application/javascript'
                    elif file_path.endswith('.json'):
                        content_type = 'application/json'
                    elif file_path.endswith('.png'):
                        content_type = 'image/png'
                    elif file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                        content_type = 'image/jpeg'
                    elif file_path.endswith('.svg'):
                        content_type = 'image/svg+xml'
                    
                    # 读取文件内容
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    
                    # 发送响应
                    self.send_response(200)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(content)
                else:
                    # 文件不存在，返回404
                    self.send_response(404)
                    self.send_header('Content-Type', 'text/html')
                    self.end_headers()
                    self.wfile.write(b'<h1>404 - File Not Found</h1>')
                    
        except Exception as e:
            print(f"错误: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(f'<h1>500 - Internal Server Error</h1><p>{str(e)}</p>'.encode())
    
    def do_OPTIONS(self):
        """处理预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    """主函数"""
    # 获取端口（Railway会自动设置）
    port = int(os.environ.get('PORT', 8000))
    
    print(f"启动代理服务器，端口: {port}")
    print(f"后端API地址: {BACKEND_URL}")
    print(f"前端访问地址: http://localhost:{port}")
    
    # 启动服务器
    server = HTTPServer(('0.0.0.0', port), ProxyHandler)
    print(f"服务器已启动，按 Ctrl+C 停止")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n正在停止服务器...")
        server.shutdown()
        print("服务器已停止")

if __name__ == '__main__':
    main() 