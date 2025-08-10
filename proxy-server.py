#!/usr/bin/env python3
"""
简单的HTTP代理服务器，解决CORS问题
将前端请求代理到后端API服务器
"""

import http.server
import urllib.request
import urllib.parse
import urllib.error
import json
from urllib.parse import urlparse, parse_qs

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        """处理GET请求"""
        try:
            # 检查是否是API请求
            if self.path.startswith('/api/'):
                # 移除 /api 前缀，转发到后端服务器
                backend_path = self.path[5:]  # 去掉 '/api/'
                backend_url = f"http://3.106.215.122:8080/{backend_path.lstrip('/')}"
                
                print(f"代理请求: {self.path} -> {backend_url}")
                
                # 转发请求到后端
                req = urllib.request.Request(backend_url)
                req.add_header('User-Agent', 'Parking-Solutions-Proxy/1.0')
                
                try:
                    with urllib.request.urlopen(req) as response:
                        # 读取响应内容
                        content = response.read()
                        
                        # 设置响应头
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                        self.end_headers()
                        
                        # 发送响应内容
                        self.wfile.write(content)
                        
                        print(f"代理响应成功: {self.path}")
                        
                except urllib.error.HTTPError as e:
                    print(f"后端API错误: {e.code} {e.reason}")
                    self.send_error(e.code, f"Backend API Error: {e.reason}")
                    
                except urllib.error.URLError as e:
                    print(f"连接后端失败: {e.reason}")
                    self.send_error(500, f"Backend Connection Error: {e.reason}")
                    
            else:
                # 静态文件请求，直接提供
                self.send_response(200)
                if self.path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html')
                elif self.path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css')
                elif self.path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                elif self.path.endswith('.jpg') or self.path.endswith('.png'):
                    self.send_header('Content-Type', 'image/jpeg')
                else:
                    self.send_header('Content-Type', 'text/plain')
                
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                # 读取并发送文件内容
                try:
                    if self.path == '/':
                        file_path = './index.html'
                    else:
                        file_path = '.' + self.path
                    
                    with open(file_path, 'rb') as f:
                        self.wfile.write(f.read())
                except FileNotFoundError:
                    self.send_error(404, "File not found")
                    
        except Exception as e:
            print(f"处理请求时出错: {e}")
            self.send_error(500, f"Internal Server Error: {e}")
    
    def do_OPTIONS(self):
        """处理预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def run_server(port=8001):
    """启动代理服务器"""
    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, ProxyHandler)
    print(f"🚀 代理服务器启动成功！")
    print(f"📍 前端地址: http://localhost:{port}")
    print(f"🔗 API代理: http://localhost:{port}/api/* -> http://3.106.215.122:8080/*")
    print(f"📁 静态文件: 从当前目录提供")
    print(f"⏹️  按 Ctrl+C 停止服务器")
    print("-" * 60)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
        httpd.server_close()

if __name__ == '__main__':
    run_server() 