/* API 客户端封装（原生 JS）
   配置入口：在页面中设置 window.API_CONFIG
   - BASE_URL?: string   例如 'http://localhost:3000'（本地 json-server）或正式后端域名
   - API_KEY?:  string   若后端需要鉴权可填；无需鉴权则留空

   用法：
   window.api.get('/parking/nearby', { lat: -37.81, lng: 144.96 })
   window.api.get('/parking/history', { datetime: '2025-08-10T10:30:00Z' })

   URL 拼接：buildUrl 会使用 BASE_URL + path，并把 params 作为查询参数追加。
   注意：若跨域访问，请确保后端已正确设置 CORS 允许当前页面源。
*/
(function () {
  const cfg = window.API_CONFIG || {};
  function buildUrl(path, params = {}) {
    const base = cfg.BASE_URL || ''; // 由 parking-page.html 中的 window.API_CONFIG 注入
    const u = new URL(base + path, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) u.searchParams.set(k, v);
    });
    return u.toString();
  }
  async function get(path, params = {}) {
    const res = await fetch(buildUrl(path, params), {
      headers: {
        'Accept': 'application/json',
        ...(cfg.API_KEY ? { 'Authorization': 'Bearer ' + cfg.API_KEY } : {}) // 可选的鉴权头
      },
      credentials: 'omit'
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
    return res.json();
  }
  window.api = { get };
})(); 