/* Parking search: fetch two endpoints and render markers
   - Nearby (by coordinates): GET /nearParking?lat&lng
   - History (by datetime):   GET /historyParking?datetime
*/
(function () {
  function ready(fn){ document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  ready(function(){
    const btn = document.getElementById('find-parking-btn');
    const locInput = document.getElementById('location');
    const date = document.getElementById('date');
    const time = document.getElementById('time');
    const results = document.getElementById('search-results');
    const modeNearby = document.getElementById('mode-nearby');
    const modeHistory = document.getElementById('mode-history');
    const groupDate = document.getElementById('group-date');
    const groupTime = document.getElementById('group-time');
    const listEl = document.getElementById('places-list');

    if (!btn || !locInput || !date || !time) return;

    function currentMode(){ return modeHistory?.checked ? 'history' : 'nearby'; }
    function updateModeUI(){
      const m = currentMode();
      if (groupDate && groupTime){
        if (m === 'nearby'){ groupDate.style.display = 'none'; groupTime.style.display = 'none'; }
        else { groupDate.style.display = ''; groupTime.style.display = ''; }
      }
    }
    modeNearby?.addEventListener('change', updateModeUI);
    modeHistory?.addEventListener('change', updateModeUI);
    updateModeUI();

    const ensureMap = () => new Promise(resolve => {
      if (window.gmap && window.gmap.map) return resolve(window.gmap.map);
      window.addEventListener('gmap-ready', () => resolve(window.gmap.map), { once: true });
    });

    function updateLocationField(){
      const pos = window.gmap?.searchPos || window.gmap?.userPos;
      if (pos && locInput){ locInput.value = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`; }
    }

    window.addEventListener('gmap-ready', updateLocationField, { once: true });
    const iv = setInterval(() => { updateLocationField(); if (window.gmap?.userPos) clearInterval(iv); }, 1000);

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const mode = currentMode();
      if (mode === 'history' && (!date.value || !time.value)) { show('请选择日期和时间'); return; }
      btn.disabled = true; btn.textContent = 'Searching...';
      try {
        const map = await ensureMap();
        let params = {};
        let path = '';
        let queryOrigin = null;
        // 接口路径与参数说明：
        // - 附近车位（坐标搜）：GET /nearParking?lat=...&lng=...
        // - 历史查询（按时间）：GET /historyParking?datetime=ISO8601
        //   以上 path 会与 parking-page.html 中的 BASE_URL 拼成最终请求地址。
        //   例如 BASE_URL='http://3.106.215.122:8080' 时，请求为：
        //   http://3.106.215.122:8080/nearParking?lat=...&lng=...
        if (mode === 'nearby'){
          const pos = window.gmap?.searchPos || window.gmap?.userPos;
          if (!pos){ show('请在地图上选择坐标或允许定位'); return; }
          params = { lat: pos.lat, lng: pos.lng };
          path = '/nearParking';
          queryOrigin = pos;
        } else {
          const dtLocal = `${date.value}T${time.value}`;
          const dt = new Date(dtLocal);
          const datetimeISO = isNaN(dt.getTime()) ? `${date.value}T${time.value}:00Z` : dt.toISOString();
          params = { datetime: datetimeISO };
          path = '/historyParking';
          queryOrigin = window.gmap?.searchPos || window.gmap?.userPos || null;
        }
        const spots = await fetchSpots(path, params);
        const enriched = addDistance(spots, queryOrigin); // 仅附加距离，不改变顺序
        const arranged = enriched; // 保持后端原始顺序
        renderSpots(map, arranged);
        renderList(arranged);
        const total = arranged.length;
        const avail = arranged.reduce((s, v) => s + (Number(v.unoccupied)||0), 0);
        const all = arranged.reduce((s, v) => s + (Number(v.total)||0), 0);
        const localText = mode==='history' ? `${date.value} ${time.value}` : (locInput.value||'current location');
        show(`找到 ${total} 个停车点，可用 ${avail}/${all} 个车位（${localText}）`);
      } catch (err) {
        console.error(err); show('搜索失败，请稍后重试');
      } finally {
        btn.disabled = false; btn.textContent = 'Find Parking';
      }
    });

    function show(msg){ if (!results) return; results.textContent = msg; results.classList.remove('hide'); results.classList.add('show'); }

    // 数据获取策略：
    // 请求后端（BASE_URL + path + 查询参数）
    // 支持两种响应格式：
    // a) 直接数组：[{ latitude, longitude, unoccupied, total, time }]
    // b) 带 data 包裹：{ code: 0|200|'0', data: [...] }
    async function fetchSpots(path, params){
      const normalize = (resp) => {
        if (Array.isArray(resp)) return resp; // 直接数组
        // 后端返回 code: 1 表示成功，code: 0 表示失败
        const ok = resp && (resp.code===1 || resp.code===200 || resp.code==='1');
        return ok && Array.isArray(resp.data) ? resp.data : [];
      };
      
      try {
        const resp = await window.api.get(path, params);
        const data = normalize(resp);
        if (!data.length) throw new Error('后端返回空数据');
        return data;
      } catch (e) {
        console.error('API请求失败:', e);
        throw new Error(`连接后端失败: ${e.message}`);
      }
    }

    function addDistance(items, origin){
      if (!origin) return items.map((d)=>({ ...d, distanceMeters: null }));
      const R = 6371000; const toRad = (x)=> x*Math.PI/180; const { lat: lat1, lng: lon1 } = origin;
      function calc(lat2, lon2){ const φ1=toRad(lat1), φ2=toRad(lat2); const Δφ=toRad(lat2-lat1), Δλ=toRad(lon2-lon1); const a=Math.sin(Δφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2; return 2*R*Math.asin(Math.sqrt(a)); }
      // 仅计算距离并附加，不改变顺序
      return items.map(d=>({ ...d, distanceMeters: calc(Number(d.latitude), Number(d.longitude)) }));
    }

    function renderSpots(map, spots){
      const maps = window.google.maps;
      window._spotMarkers = window._spotMarkers || [];
      window._spotMarkers.forEach(m => m.setMap(null));
      window._spotMarkers = [];
      if (!spots || !spots.length) return;

      const bounds = new maps.LatLngBounds();
      spots.forEach(s => {
        const pos = { lat: Number(s.latitude), lng: Number(s.longitude) };
        if (!isFinite(pos.lat) || !isFinite(pos.lng)) return;
        const dist = s.distanceMeters!=null ? ` · ${formatDistance(s.distanceMeters)}` : '';
        const title = `可用 ${s.unoccupied}/${s.total}${dist}`;
        const marker = new maps.Marker({ position: pos, map, title, label: `${s.unoccupied}` });
        // 点击弹窗：显示总数与空闲
        marker.addListener('click', () => {
          if (!window._spotInfoWindow) window._spotInfoWindow = new maps.InfoWindow();
          const html = `<div style="min-width:160px">
            <div style="font-weight:600;margin-bottom:4px;">Parking</div>
            <div>Total: ${Number(s.total)||0}</div>
            <div>Unoccupied: ${Number(s.unoccupied)||0}</div>
            ${s.distanceMeters!=null?`<div>Distance: ${formatDistance(s.distanceMeters)}</div>`:''}
          </div>`;
          window._spotInfoWindow.setContent(html);
          window._spotInfoWindow.open({ anchor: marker, map });
        });
        window._spotMarkers.push(marker);
        bounds.extend(pos);
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds);
    }

    function renderList(spots){
      if (!listEl) return;
      if (!spots || !spots.length){ listEl.innerHTML = ''; return; }
      const header = `<div class="places-list-header">${spots.length} places found</div>`;
      const items = spots.map((s, i)=>{
        const idx = i+1; const title = `Location ${idx}`; const dist = s.distanceMeters!=null ? formatDistance(s.distanceMeters) : '';
        const gmap = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.latitude+","+s.longitude)}`;
        return `<div class="place-item">
          <div class="place-row"><div class="place-title">${title}</div>
          <div class="place-actions"><a class="place-link" href="${gmap}" target="_blank" rel="noopener">Get Directions</a></div></div>
          <div class="place-address">${dist ? dist+' · ' : ''}Address</div>
        </div>`;
      }).join('');
      listEl.innerHTML = header + items;
    }

    function formatDistance(m){ if (m>=1000) return (m/1000).toFixed(1)+' km'; return Math.round(m)+' m'; }
  });
})(); 