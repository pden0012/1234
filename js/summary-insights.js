/* Summary cards: populate latest population and ownership rate (derived) */
(function(){
  const fmt = (n)=> (n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const cfg = window.API_CONFIG || {};

  async function fetchWithFallback(remotePath, localPath){
    if (cfg.USE_MOCK === true){
      const r = await fetch(localPath, { headers: { 'Accept': 'application/json' } });
      return r.json();
    }
    try {
      const resp = await window.api.get(remotePath);
      if (Array.isArray(resp)) return resp;
      // 支持多种成功响应码：0, 1, 200, '0', '1'
      const ok = resp && (resp.code === 0 || resp.code === 1 || resp.code === 200 || resp.code === '0' || resp.code === '1');
      if (!ok) throw new Error('bad');
      return Array.isArray(resp.data) ? resp.data : [];
    } catch(e){
      const r = await fetch(localPath, { headers: { 'Accept': 'application/json' } });
      return r.json();
    }
  }

  function latestByYear(rows){
    if (!Array.isArray(rows) || rows.length===0) return null;
    return rows.reduce((a,b)=> (Number(a.year)>Number(b.year)?a:b));
  }

  async function updatePopulation(){
    const el = document.getElementById('summary-population-value');
    if (!el) return;
    try{
      const rows = await fetchWithFallback('/graph/population','/data/mock-population.json');
      const latest = latestByYear(Array.isArray(rows)?rows:(rows.data||[]));
      if (latest) el.textContent = fmt(Number(latest.amount)||0);
      else el.textContent = '--';
    }catch(e){ el.textContent='--'; }
  }

  async function updateOwnership(){
    const elRate = document.getElementById('summary-ownership-rate');
    if (!elRate) return;
    try{
      const [vehRows, popRows] = await Promise.all([
        fetchWithFallback('/graph/vehicle','/data/mock-vehicle.json'),
        fetchWithFallback('/graph/population','/data/mock-population.json')
      ]);
      const vehLatest = latestByYear(Array.isArray(vehRows)?vehRows:(vehRows.data||[]));
      const popLatest = latestByYear(Array.isArray(popRows)?popRows:(popRows.data||[]));
      if (vehLatest && popLatest && Number(popLatest.amount)>0){
        const ratio = Number(vehLatest.amount) / Number(popLatest.amount);
        elRate.textContent = (Math.round(ratio*100)/100).toFixed(2); // cars per person
      } else {
        elRate.textContent='--';
      }
    }catch(e){ elRate.textContent='--'; }
  }

  function init(){ updatePopulation(); updateOwnership(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})(); 