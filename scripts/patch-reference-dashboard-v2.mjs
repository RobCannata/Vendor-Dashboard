import fs from 'node:fs/promises';
import path from 'node:path';

const filePath = path.resolve(process.cwd(), 'dist', 'index.html');
const html = await fs.readFile(filePath, 'utf8');

const css = String.raw`
<style id="reference-dashboard-v2">
#mbr-reference-shell .mbr{grid-template-columns:296px minmax(0,1fr);gap:0}
#mbr-reference-shell .rail{padding:14px 12px 10px;gap:12px}
#mbr-reference-shell .brand{padding:8px 9px 12px;align-items:flex-start}
#mbr-reference-shell .brandmark{width:46px;height:46px;border-radius:13px;font-size:25px}
#mbr-reference-shell .brand h1{font-size:23px;line-height:.98;margin:3px 0 5px}
#mbr-reference-shell .brand p{font-size:10px}
#mbr-reference-shell .railcard{border-radius:12px;padding:12px}
#mbr-reference-shell .qrow{padding:8px 0}
#mbr-reference-shell .qrow span{font-size:10px}
#mbr-reference-shell .qrow b{font-size:15px}
#mbr-reference-shell .qrow .dot{width:11px;height:11px}
#mbr-reference-shell .main{padding:14px 14px 8px}
#mbr-reference-shell .topline{margin-bottom:10px;align-items:center}
#mbr-reference-shell .topline h2{font-size:27px;margin:2px 0 4px}
#mbr-reference-shell .topline p{font-size:10px}
#mbr-reference-shell .asof{min-width:180px;padding:9px 11px;border-radius:10px}
#mbr-reference-shell .kpis{grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin-bottom:10px}
#mbr-reference-shell .kpis>div{min-height:101px;padding:11px 11px 10px;border-radius:9px;display:grid;grid-template-columns:34px minmax(0,1fr);grid-template-rows:auto auto auto;column-gap:8px;align-items:center}
#mbr-reference-shell .kpis .kpi-icon{grid-row:1 / span 3;grid-column:1;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:16px;font-weight:900;background:rgba(38,116,255,.18);border:1px solid rgba(71,151,255,.22);color:#65b7ff}
#mbr-reference-shell .kpis span{grid-column:2;font-size:8px;line-height:1.15;letter-spacing:.06em}
#mbr-reference-shell .kpis b{grid-column:2;font-size:22px;line-height:.95;margin:4px 0 1px}
#mbr-reference-shell .kpis small{grid-column:2;font-size:8px;line-height:1.1}
#mbr-reference-shell .g3{grid-template-columns:1.5fr .84fr .84fr;gap:8px}
#mbr-reference-shell .lower{grid-template-columns:1.5fr .84fr .84fr;margin-top:8px}
#mbr-reference-shell .panel{border-radius:10px}
#mbr-reference-shell .panel header{padding:10px 11px 8px}
#mbr-reference-shell .panel h3{font-size:14px}
#mbr-reference-shell .panel header p{font-size:9px}
#mbr-reference-shell .tablewrap{padding:0 8px 8px}
#mbr-reference-shell table{font-size:9px}
#mbr-reference-shell thead th{font-size:8px;letter-spacing:.02em}
#mbr-reference-shell th,#mbr-reference-shell td{padding:6px 5px}
#mbr-reference-shell tbody td strong{font-size:9px}
#mbr-reference-shell tbody td small{font-size:7px}
#mbr-reference-shell .status{font-size:7px;padding:3px 5px}
#mbr-reference-shell .vchart{height:220px;padding:8px 10px 12px;align-items:flex-end;gap:8px}
#mbr-reference-shell .vbar{width:34px;gap:4px}
#mbr-reference-shell .vbar b{font-size:9px}
#mbr-reference-shell .vbartrack{height:158px;border-radius:5px 5px 2px 2px}
#mbr-reference-shell .vbar span{font-size:7px;line-height:1.05;text-align:center}
#mbr-reference-shell .hbars{padding:8px 11px 6px}
#mbr-reference-shell .hrow{grid-template-columns:82px minmax(0,1fr) 42px;gap:6px;padding:7px 0}
#mbr-reference-shell .hrow span{font-size:8px}
#mbr-reference-shell .hrow b{font-size:8px}
#mbr-reference-shell .hrow div{height:9px}
#mbr-reference-shell .aginggrid{padding:8px;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
#mbr-reference-shell .aging{min-height:70px;border-radius:8px;padding:9px}
#mbr-reference-shell .aging span{font-size:8px}
#mbr-reference-shell .aging b{font-size:18px}
#mbr-reference-shell .aging small{font-size:7px}
#mbr-reference-shell .topitems{padding:4px 8px 8px}
#mbr-reference-shell .topitems h4{font-size:10px;margin:3px 0 6px}
#mbr-reference-shell .topitems div{padding:5px 4px;font-size:8px}
#mbr-reference-shell .mchart{height:220px;padding:8px 10px 14px;align-items:flex-end;gap:9px}
#mbr-reference-shell .mbar{width:34px}
#mbr-reference-shell .mbar b{font-size:8px}
#mbr-reference-shell .mbar div{height:158px}
#mbr-reference-shell .mbar span{font-size:7px}
#mbr-reference-shell .foot{padding-top:8px;font-size:8px}

#mbr-reference-shell .v2-table table{min-width:740px}
#mbr-reference-shell .v2-table .vendor-col{width:150px}
#mbr-reference-shell .v2-table .metric{text-align:center;white-space:nowrap}
#mbr-reference-shell .v2-table .metric b{font-size:9px}
#mbr-reference-shell .v2-table .muted{color:#70829a}
#mbr-reference-shell .quality-target{display:flex;justify-content:space-between;align-items:center;padding:7px 11px 10px;border-top:1px solid rgba(140,169,210,.10);font-size:8px;color:#71839a}
#mbr-reference-shell .quality-target strong{color:#34d9b2}

@media (max-width:1400px){
  #mbr-reference-shell .mbr{grid-template-columns:240px minmax(0,1fr)}
  #mbr-reference-shell .kpis{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media (max-width:980px){
  #mbr-reference-shell .mbr{grid-template-columns:1fr}
  #mbr-reference-shell .rail{border-right:0;border-bottom:1px solid rgba(140,169,210,.15)}
  #mbr-reference-shell .g3,#mbr-reference-shell .lower{grid-template-columns:1fr}
  #mbr-reference-shell .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
}
</style>`;

const js = String.raw`
<script id="reference-dashboard-v2-script">
(function(){
  if (window.__mbrReferenceV2Applied) return;
  window.__mbrReferenceV2Applied = true;
  const root = document.getElementById('mbr-reference-shell');
  if (!root) return;
  const esc = function(v){ return String(v == null ? '' : v).replace(/[&<>\"']/g,function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'})[m]; }); };
  const num = function(v){ const n=Number(v); return Number.isFinite(n)?n:null; };
  const pct = function(v){ const n=num(v); if(n==null)return '—'; return (n <= 1 ? n*100 : n).toFixed(1)+'%'; };
  const text = function(v){ return v == null || v === '' ? '—' : esc(v); };
  const vendorScore = function(v){
    try { if (typeof scoreOfVendor === 'function') return scoreOfVendor(v); } catch(e) {}
    const s = num(v && v.liveFinalScore); if(s!=null)return s;
    const vals = Array.isArray(v && v.criteria) ? v.criteria.map(function(c){return num(c && c.value);}).filter(function(x){return x!=null;}) : [];
    return vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length*20 : null;
  };
  const criterion = function(v, patterns){
    const list = Array.isArray(v && v.criteria) ? v.criteria : [];
    const hit = list.find(function(c){
      const n = String(c && (c.name || c.label || c.title || '')).toLowerCase();
      return patterns.some(function(p){ return n.includes(p); });
    });
    return hit ? num(hit.value) : null;
  };

  const icons = ['$', '%', '▣', '◉', '◆', '$', '▤', '★'];
  root.querySelectorAll('.kpis > div').forEach(function(card, i){
    if (!card.querySelector('.kpi-icon')) {
      const icon = document.createElement('span');
      icon.className = 'kpi-icon';
      icon.textContent = icons[i] || '•';
      card.insertBefore(icon, card.firstChild);
    }
  });

  const quickColors = ['blue','green','cyan','teal','purple','blue'];
  root.querySelectorAll('.qrow').forEach(function(row, i){
    if (!row.querySelector('.qmini')) {
      const mini = document.createElement('span');
      mini.className = 'qmini';
      mini.innerHTML = '<svg viewBox="0 0 88 24" aria-hidden="true"><polyline points="1,18 14,17 24,12 34,15 46,8 56,13 66,6 77,10 87,4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>';
      row.appendChild(mini);
    }
    row.classList.add('qmini-row-'+quickColors[i%quickColors.length]);
  });

  const firstPanel = root.querySelector('.g3 .panel');
  if (firstPanel) {
    firstPanel.classList.add('v2-table');
    const table = firstPanel.querySelector('table');
    if (table && typeof VENDORS !== 'undefined') {
      const vendors = Array.isArray(VENDORS) ? VENDORS : [];
      table.innerHTML = '<thead><tr>' +
        '<th class="vendor-col">Vendor</th>' +
        '<th class="metric">Quality Score</th>' +
        '<th class="metric">Cost Index</th>' +
        '<th class="metric">On-Time</th>' +
        '<th class="metric">Safety</th>' +
        '<th class="metric">Margin</th>' +
        '<th class="metric">Invoice Accuracy</th>' +
        '<th class="metric">Status</th>' +
        '</tr></thead><tbody>' +
        vendors.map(function(v){
          const s = vendorScore(v);
          const cost = criterion(v,['cost index','cost']);
          const ontime = criterion(v,['on-time','on time','timeliness']);
          const safety = criterion(v,['safety']);
          const margin = criterion(v,['margin','contribution']);
          const invoice = criterion(v,['invoice accuracy','invoice','accuracy']);
          const tone = s == null ? 'watch' : s >= 90 ? 'good' : s >= 80 ? 'watch' : 'risk';
          const status = s == null ? 'No Score' : s >= 90 ? 'Green' : s >= 80 ? 'Watch' : 'At Risk';
          return '<tr>' +
            '<td><strong>'+esc(v.name)+'</strong><small>'+esc((v.projects||[]).map(function(p){return p.name;}).slice(0,2).join(' • ') || 'Live scorecard')+'</small></td>' +
            '<td class="metric"><b>'+ (s == null ? '—' : Number(s).toFixed(1)) +'</b></td>' +
            '<td class="metric muted">'+ (cost == null ? '—' : Number(cost).toFixed(2)) +'</td>' +
            '<td class="metric muted">'+pct(ontime)+'</td>' +
            '<td class="metric muted">'+pct(safety)+'</td>' +
            '<td class="metric muted">'+pct(margin)+'</td>' +
            '<td class="metric muted">'+pct(invoice)+'</td>' +
            '<td class="metric"><span class="status '+tone+'">'+status+'</span></td>' +
            '</tr>';
        }).join('') + '</tbody>';
    }
    let target = firstPanel.querySelector('.quality-target');
    if (!target) {
      target = document.createElement('div');
      target.className = 'quality-target';
      target.innerHTML = '<span>Vendor quality threshold</span><strong>Target ≥ 90</strong>';
      firstPanel.appendChild(target);
    }
  }

  const qualityPanel = root.querySelectorAll('.g3 .panel')[1];
  if (qualityPanel) {
    const title = qualityPanel.querySelector('h3');
    if (title) title.textContent = 'Vendor Quality Score';
    const vendors = Array.isArray(window.VENDORS) ? window.VENDORS : [];
    const scores = vendors.map(function(v){ return {name:v.name,score:vendorScore(v)}; }).filter(function(x){return x.score!=null;}).sort(function(a,b){return b.score-a.score;});
    const chart = qualityPanel.querySelector('.vchart');
    if (chart) {
      chart.innerHTML = scores.map(function(x){
        const s=Math.max(0,Math.min(100,x.score));
        return '<div class="vbar"><b>'+Number(s).toFixed(1)+'</b><div class="vbartrack"><i style="height:'+s+'%"></i></div><span>'+esc(x.name)+'</span></div>';
      }).join('');
    }
  }

  const costPanel = root.querySelectorAll('.g3 .panel')[2];
  if (costPanel) {
    const h = costPanel.querySelector('h3'); if(h) h.textContent='Vendor Cost Exposure';
    const p = costPanel.querySelector('p'); if(p) p.textContent='Recorded ClickUp vendor invoice cost';
  }

  const projectPanel = root.querySelector('.lower .panel');
  if (projectPanel) {
    const table = projectPanel.querySelector('table');
    if (table) {
      const headers = table.querySelectorAll('th');
      if (headers[4]) headers[4].textContent = 'Install Margin';
      if (headers[5]) headers[5].textContent = 'Margin Level';
    }
  }

  const lowerThird = root.querySelectorAll('.lower .panel')[2];
  if (lowerThird) {
    const title = lowerThird.querySelector('h3'); if(title) title.textContent='Invoice & Data Coverage';
  }
})();
</script>`;

const out = html.replace('</head>', css + '</head>').replace('</body>', js + '</body>');
await fs.writeFile(filePath, out, 'utf8');
console.log('Applied reference dashboard v2 visual treatment.');
