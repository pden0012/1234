/* Vehicle registrations line chart with fallback */
(function () {
  async function init() {
    const mount = document.getElementById('vehicle-chart');
    if (!mount) return;

    const cfg = window.API_CONFIG || {};
    const REMOTE = '/graph/vehicle';
    const LOCAL = '/data/mock-vehicle.json';

    const setStatus = (t) => { mount.textContent = t; };

    try {
      setStatus('Loading…');
      let rows;

      const normalize = (resp) => {
        if (Array.isArray(resp)) return resp;
        // 支持多种成功响应码：0, 1, 200, '0', '1'
        const ok = resp && (resp.code === 0 || resp.code === 1 || resp.code === 200 || resp.code === '0' || resp.code === '1');
        if (!ok) throw new Error((resp && resp.msg) || 'Bad response');
        return Array.isArray(resp.data) ? resp.data : [];
      };

      if (cfg.USE_MOCK === true) {
        const r = await fetch(LOCAL); rows = await r.json();
      } else {
        try {
          const remote = await window.api.get(REMOTE);
          const rr = normalize(remote);
          if (!rr.length) throw new Error('empty');
          rows = rr;
        } catch (e) {
          const r = await fetch(LOCAL); rows = await r.json();
        }
      }

      if (!rows || !rows.length) throw new Error('no data');
      const series = rows.map(d => ({ label: String(d.year), value: Number(d.amount) || 0 }));
      renderLine(series, mount);
    } catch (e) {
      console.error(e); setStatus('Failed to load data');
    }
  }

  function formatNumber(n){return (n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');}

  function renderLine(data, el) {
    el.innerHTML='';
    const width = el.clientWidth || 680;
    const height = el.clientHeight || 350;
    const pad = {t: 56, r: 32, b: 64, l: 84};
    const plotW = width - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;

    const maxV = Math.max(1, ...data.map(d=>d.value));
    const rough = Math.ceil(maxV/5);
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const bases=[1,2,5,10]; let step=pow; for(const b of bases){ if(rough<=b*pow){ step=b*pow; break; } }
    const maxTick = Math.ceil(maxV/step)*step;

    const NS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('width', width); svg.setAttribute('height', height);

    const x0=pad.l, y0=height-pad.b, x1=width-pad.r, y1=pad.t;

    // Title
    const title=document.createElementNS(NS,'text');
    title.textContent = "Melbourne’s vehicle ownership growth over the years";
    title.setAttribute('x', x0); title.setAttribute('y', pad.t-20);
    title.setAttribute('fill','#777'); title.setAttribute('font-size','18'); title.setAttribute('font-weight','600');
    svg.appendChild(title);

    // Axes + grid
    const mk=(x1,y1,x2,y2,c='#bbb')=>{const l=document.createElementNS(NS,'line'); l.setAttribute('x1',x1);l.setAttribute('y1',y1);l.setAttribute('x2',x2);l.setAttribute('y2',y2);l.setAttribute('stroke',c); return l;};
    svg.appendChild(mk(x0,y0,x1,y0,'#ccc'));
    svg.appendChild(mk(x0,y0,x0,y1,'#ccc'));
    for(let v=0; v<=maxTick; v+=step){ const y=y0-(v/maxTick)*plotH; svg.appendChild(mk(x0,y,x1,y,'#eee')); const t=document.createElementNS(NS,'text'); t.textContent=formatNumber(v); t.setAttribute('x',x0-8); t.setAttribute('y',y+4); t.setAttribute('text-anchor','end'); t.setAttribute('fill','#888'); t.setAttribute('font-size','12'); svg.appendChild(t); }

    // Axis names
    const xName=document.createElementNS(NS,'text'); xName.textContent='Year'; xName.setAttribute('x',(x0+x1)/2); xName.setAttribute('y',height-16); xName.setAttribute('text-anchor','middle'); xName.setAttribute('fill','#666'); xName.setAttribute('font-size','12'); svg.appendChild(xName);
    const yName=document.createElementNS(NS,'text'); yName.textContent='Registered Vehicles'; yName.setAttribute('x',16); yName.setAttribute('y',(y1+y0)/2); yName.setAttribute('transform',`rotate(-90 16 ${(y1+y0)/2})`); yName.setAttribute('text-anchor','middle'); yName.setAttribute('fill','#666'); yName.setAttribute('font-size','12'); svg.appendChild(yName);

    // line path with markers
    const color='#2E7D32'; // green
    const slot=plotW/(data.length-1);
    const pts=data.map((d,i)=>{ const x=x0+i*slot; const y=y0-(d.value/maxTick)*plotH; return {x,y,label:d.label,value:d.value}; });
    const path=document.createElementNS(NS,'path');
    const dAttr=pts.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ');
    path.setAttribute('d', dAttr); path.setAttribute('fill','none'); path.setAttribute('stroke',color); path.setAttribute('stroke-width','3');
    svg.appendChild(path);
    pts.forEach(p=>{ const c=document.createElementNS(NS,'circle'); c.setAttribute('cx',p.x); c.setAttribute('cy',p.y); c.setAttribute('r','4'); c.setAttribute('fill',color); const tip=document.createElementNS(NS,'title'); tip.textContent=`${p.label}: ${formatNumber(p.value)}`; c.appendChild(tip); svg.appendChild(c); });

    el.appendChild(svg);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})(); 