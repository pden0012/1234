/* Population chart with mock fallback (bar + line, legend, gridlines) */
(function () {
  async function init() {
    const mount = document.getElementById('population-chart');
    if (!mount) return;

    const cfg = window.API_CONFIG || {};
    const REMOTE_PATH = '/graph/population';
    const LOCAL_PATH = '/data/mock-population.json';

    const setStatus = (t) => { mount.textContent = t; };

    try {
      setStatus('Loading…');
      let rows;

      // Helper: normalize response to rows array
      const normalize = (resp) => {
        if (Array.isArray(resp)) return resp;
        // 支持多种成功响应码：0, 1, 200, '0', '1'
        const ok = resp && (resp.code === 0 || resp.code === 1 || resp.code === 200 || resp.code === '0' || resp.code === '1');
        if (!ok) throw new Error((resp && resp.msg) || 'Bad response');
        return Array.isArray(resp.data) ? resp.data : [];
      };

      // Strategy:
      // 1) If USE_MOCK === true → use local directly
      // 2) Else try remote → on any error/empty fallback to local
      if (cfg.USE_MOCK === true) {
        const r = await fetch(LOCAL_PATH, { headers: { 'Accept': 'application/json' } });
        rows = await r.json();
      } else {
        try {
          const remoteResp = await window.api.get(REMOTE_PATH);
          const remoteRows = normalize(remoteResp);
          if (remoteRows.length === 0) throw new Error('Empty remote data');
          rows = remoteRows;
        } catch (e) {
          // Fallback to local same-origin, do NOT prepend BASE_URL
          const r = await fetch(LOCAL_PATH, { headers: { 'Accept': 'application/json' } });
          rows = await r.json();
        }
      }

      if (!rows || rows.length === 0) throw new Error('No data after fallback');

      // Bars: car ownership (amount)
      const bars = rows.map(d => ({ label: String(d.year), value: Number(d.amount) || 0 }));
      // Line: demand for parking (prefer d.demand; else derive)
      const line = rows.map((d, i) => {
        let v = d.demand;
        if (v == null) {
          const amt = Number(d.amount) || 0;
          const factor = 0.9 + 0.1 * Math.sin(i / Math.max(1, rows.length - 1) * Math.PI);
          v = Math.round(amt * factor);
        }
        return { label: String(d.year), value: Number(v) || 0 };
      });

      renderComboChart({ bars, line }, mount);
    } catch (e) {
      console.error(e);
      setStatus('Failed to load data');
    }
  }

  function formatNumber(n) {
    return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function renderComboChart(series, el) {
    const { bars, line } = series;
    const labels = bars.map(b => b.label);
    el.innerHTML = '';

    const width = el.clientWidth || 680;
    const height = el.clientHeight || 350;
    const pad = { t: 64, r: 32, b: 64, l: 84 };
    const plotW = width - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;

    const maxV = Math.max(
      1,
      ...bars.map(d => d.value),
      ...line.map(d => d.value)
    );

    const rough = Math.ceil(maxV / 5);
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const bases = [1, 2, 5, 10];
    let step = pow; for (const b of bases) { if (rough <= b * pow) { step = b * pow; break; } }
    const maxTick = Math.ceil(maxV / step) * step;

    const barSlot = plotW / labels.length;
    const barW = barSlot * 0.6;

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    const x0 = pad.l, y0 = height - pad.b, x1 = width - pad.r, y1 = pad.t;

    const title = document.createElementNS(NS, 'text');
    title.textContent = 'Growth in vehicles and demand for parking';
    title.setAttribute('x', x0);
    title.setAttribute('y', pad.t - 28);
    title.setAttribute('fill', '#777');
    title.setAttribute('font-size', '18');
    title.setAttribute('font-weight', '600');
    svg.appendChild(title);

    // Legend
    let legendX = x0; const legendY = pad.t - 8;
    const addLegendItem = (shape, color, label) => {
      if (shape === 'line') {
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', legendX); l.setAttribute('y1', legendY);
        l.setAttribute('x2', legendX + 24); l.setAttribute('y2', legendY);
        l.setAttribute('stroke', color); l.setAttribute('stroke-width', '3');
        svg.appendChild(l);
      } else {
        const r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', legendX); r.setAttribute('y', legendY - 8);
        r.setAttribute('width', 16); r.setAttribute('height', 16);
        r.setAttribute('fill', color); // no opacity for legend swatch
        svg.appendChild(r);
      }
      const t = document.createElementNS(NS, 'text');
      t.textContent = label; t.setAttribute('x', legendX + 32); t.setAttribute('y', legendY + 4);
      t.setAttribute('fill', '#555'); t.setAttribute('font-size', '12');
      svg.appendChild(t);
      legendX += 160;
    };
    addLegendItem('line', '#E74C3C', 'Demand for Parking');
    addLegendItem('rect', '#69A1FF', 'Car Ownership');

    const mkLine = (x1, y1, x2, y2, color = '#bbb') => {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('stroke', color); return l;
    };
    svg.appendChild(mkLine(x0, y0, x1, y0, '#ccc'));
    svg.appendChild(mkLine(x0, y0, x0, y1, '#ccc'));

    for (let v = 0; v <= maxTick; v += step) {
      const y = y0 - (v / maxTick) * plotH;
      svg.appendChild(mkLine(x0, y, x1, y, '#eee'));
      const lbl = document.createElementNS(NS, 'text');
      lbl.textContent = formatNumber(v);
      lbl.setAttribute('x', x0 - 8); lbl.setAttribute('y', y + 4);
      lbl.setAttribute('text-anchor', 'end'); lbl.setAttribute('fill', '#888'); lbl.setAttribute('font-size', '12');
      svg.appendChild(lbl);
    }

    const xName = document.createElementNS(NS, 'text');
    xName.textContent = 'Year'; xName.setAttribute('x', (x0 + x1) / 2);
    xName.setAttribute('y', height - 16); xName.setAttribute('text-anchor', 'middle');
    xName.setAttribute('fill', '#666'); xName.setAttribute('font-size', '12'); svg.appendChild(xName);

    const yName = document.createElementNS(NS, 'text');
    yName.textContent = 'Population'; yName.setAttribute('x', 16);
    yName.setAttribute('y', (y1 + y0) / 2);
    yName.setAttribute('transform', `rotate(-90 16 ${(y1 + y0) / 2})`);
    yName.setAttribute('text-anchor', 'middle'); yName.setAttribute('fill', '#666'); yName.setAttribute('font-size', '12'); svg.appendChild(yName);

    const barColor = '#69A1FF';
    bars.forEach((d, i) => {
      const h = (d.value / maxTick) * plotH;
      const x = x0 + i * (plotW / labels.length) + ((plotW / labels.length) - barW) / 2;
      const y = y0 - h;
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y);
      rect.setAttribute('width', barW); rect.setAttribute('height', h);
      rect.setAttribute('fill', barColor); // solid color, no opacity
      rect.setAttribute('rx', '3'); rect.setAttribute('ry', '3');
      const tip = document.createElementNS(NS, 'title'); tip.textContent = `${labels[i]}: ${formatNumber(d.value)}`; rect.appendChild(tip);
      svg.appendChild(rect);
    });

    const lineColor = '#E74C3C';
    const slot = plotW / labels.length;
    const pts = line.map((d, i) => {
      const x = x0 + i * slot + slot / 2;
      const y = y0 - (d.value / maxTick) * plotH;
      return { x, y, label: labels[i], value: d.value };
    });
    const path = document.createElementNS(NS, 'path');
    const dAttr = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    path.setAttribute('d', dAttr); path.setAttribute('fill', 'none');
    path.setAttribute('stroke', lineColor); path.setAttribute('stroke-width', '2.5');
    svg.appendChild(path);
    pts.forEach(p => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', '3.5');
      c.setAttribute('fill', lineColor);
      const tip = document.createElementNS(NS, 'title'); tip.textContent = `${p.label}: ${formatNumber(p.value)}`; c.appendChild(tip);
      svg.appendChild(c);
    });

    el.appendChild(svg);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})(); 