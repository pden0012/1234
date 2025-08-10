# CORS问题解决方案

## 问题描述
您的停车解决方案网站遇到了CORS（跨域资源共享）问题：
- 前端页面运行在 `localhost:8000`
- 后端API运行在 `3.106.215.122:8080`
- 浏览器阻止了跨域请求

## 解决方案
我们创建了一个Python代理服务器来解决CORS问题：

### 1. 代理服务器功能
- **地址**: `http://localhost:8001`
- **功能**: 将前端请求代理到后端API服务器
- **CORS支持**: 自动添加必要的CORS头信息

### 2. 使用方法

#### 启动代理服务器
```bash
python3 proxy-server.py
```

#### 访问网站
- **主页**: `http://localhost:8001/`
- **停车页面**: `http://localhost:8001/parking-page.html`
- **数据洞察**: `http://localhost:8001/data-insights.html`
- **环保页面**: `http://localhost:8001/eco-page.html`

#### API调用示例
```javascript
// 附近停车查询
fetch('http://localhost:8001/api/nearParking?lat=-37.81&lng=144.96')
  .then(response => response.json())
  .then(data => console.log(data));

// 历史停车查询
fetch('http://localhost:8001/api/historyParking?datetime=2025-08-10T10:30:00Z')
  .then(response => response.json())
  .then(data => console.log(data));
```

### 3. 代理服务器工作原理
```
前端页面 (localhost:8001) 
    ↓
代理服务器 (localhost:8001/api/*)
    ↓
后端API (3.106.215.122:8080/*)
```

### 4. 配置说明
在 `parking-page.html` 中：
```javascript
window.API_CONFIG = {
  BASE_URL: 'http://localhost:8001/api', // 代理服务器路径
  API_KEY: '',
  USE_MOCK: false,
  GMAPS_API_KEY: '...'
};
```

### 5. 优势
- ✅ 解决CORS问题
- ✅ 无需修改后端代码
- ✅ 支持所有HTTP方法
- ✅ 自动添加CORS头
- ✅ 请求日志记录

### 6. 注意事项
- 确保代理服务器在8001端口运行
- 如果端口被占用，可以修改 `proxy-server.py` 中的端口号
- 代理服务器会自动转发所有 `/api/*` 请求到后端

## 测试结果
✅ 代理服务器成功启动在端口8001
✅ 前端页面可以正常访问
✅ API请求成功代理到后端
✅ 返回了真实的停车数据

现在您可以在浏览器中访问 `http://localhost:8001/parking-page.html` 来测试停车查询功能了！ 