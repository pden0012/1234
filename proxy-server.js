const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// 启用CORS
app.use(cors());

// 静态文件服务
app.use(express.static('.'));

// 代理API请求到您的后端服务器
app.use('/api', createProxyMiddleware({
  target: 'http://3.106.215.122:8080',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // 移除 /api 前缀
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`代理请求: ${req.method} ${req.url} -> ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`代理响应: ${req.url} -> ${proxyRes.statusCode}`);
  }
}));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
  console.log(`API请求将被代理到 http://3.106.215.122:8080`);
  console.log(`例如: http://localhost:${PORT}/api/nearParking?lat=-37.81&lng=144.96`);
}); 