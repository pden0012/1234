const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 后端API地址
const BACKEND_URL = 'http://3.106.215.122:8080';

// 启用CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 静态文件服务
app.use(express.static('.'));

// 设置默认首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API代理中间件
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // 移除 /api 前缀
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`代理请求: ${req.method} ${req.path} -> ${BACKEND_URL}${req.path.replace('/api', '')}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`代理响应: ${req.path} -> ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`代理错误: ${err.message}`);
    res.status(500).json({ error: '代理服务器错误', message: err.message });
  }
}));

// 处理所有其他路由，返回index.html（支持SPA）
app.get('*', (req, res) => {
  // 如果是API请求，不处理
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API路径不存在' });
  }
  
  // 如果是静态文件请求，尝试提供文件
  const filePath = path.join(__dirname, req.path);
  if (require('fs').existsSync(filePath) && require('fs').statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  
  // 否则返回index.html（支持前端路由）
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 代理服务器已启动`);
  console.log(`📍 端口: ${PORT}`);
  console.log(`🌐 前端地址: http://localhost:${PORT}`);
  console.log(`🔗 后端API: ${BACKEND_URL}`);
  console.log(`📁 静态文件: ${__dirname}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
}); 