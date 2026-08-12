import fs from 'node:fs/promises';
import path from 'node:path';

const filePath = path.resolve(process.cwd(), 'dist', 'index.html');

const SCRIPT = `<script id="reference-dashboard-script">
(function(){
  function money(v){
    if(!Number.isFinite(v)) return '—';
    const abs=Math.abs(v);
    const sign=v<0?'-':'';
    if(abs>=1000000) return sign+'$'+(abs/1000000).toFixed(2)+'M';
    if(abs>=1000) return sign+'$'+(abs/1000).toFixed(0)+'K';
    return sign+'$'+Math.round(abs).toLocaleString();
  }
  function pct(v,d=1){ return Number.isFinite(v) ? v.toFixed(d)+'%' : '—'; }
  function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
  function esc(v){ return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m])); }
  function score(v){
    try{ if(typeof scoreOfVendor==='function') return scoreOfVendor(v); }catch(e){}
    const vals=(v?.criteria||[]).map(c=>Number(c.value)).filter(Number.isFinite);
    return vals.length?Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*20):null;
  }
  function mount(){
    if(document.getElementById('mbr-reference-shell')) return;
    if(typeof DATA==='undefined' || typeof VENDORS==='undefined') return;

    const rows=Array.isArray(DATA)?DATA:[];
    const vendors=Array.isArray(VENDORS)?VENDORS:[];
    const revenue=rows.filter(r=>r.revenueRecorded&&Number.isFinite(Number(r.revenue))).reduce((a,r)=>a+num(r.revenue),0);
    const vendorCost=rows.filter(r=>r.invoiceRecorded&&Number.isFinite(Number(r.invoice))).reduce((a,r)=>a+num(r.invoice),0);
    const margin=revenue?((revenue-vendorCost)/revenue)*100:null;
    const active=rows.filter(r=>r.active).length;
    const vendorScores=vendors.map(score).filter(Number.isFinite);
    const overall=vendorScores.length?vendorScores.reduce((a,b)=>a+b,0)/vendorScores.length:null;
    const invoiceCount=rows.filter(r=>r.revenueRecorded).length;
    const scorecardCount=vendors.length;
    const updated=new Date();

    const vendorTable=vendors.map(v=>{
      const s=score(v);
      const projects=Array.isArray(v.projects)?v.projects:[];
      const latest=projects.slice(0,3).map(p=>p.name).filter(Boolean).join(' • ');
      const tone=s==null?'watch':s>=90?'green':s>=80?'watch':'risk';
      return '<tr><td><strong>'+esc(v.name)+'</strong><small>'+esc(latest||'Vendor scorecard')+'</small></td><td class="score-cell">'+(s==null?'—':s.toFixed(1))+'</td><td>'+projects.length+'</td><td>'+esc(vendors.length?'Live':'—')+'</td><td><span class="status '+tone+'">'+(s==null?'No Score':s>=90?'Green':s>=80?'Watch':'At Risk')+'</span></td></tr>';
    }).join('');

    const vendorBars=vendors.map(v=>{
      const s=score(v)||0;
      return '<div class="vbar"><div class="vbar-value">'+s.toFixed(1)+'</div><div class="vbar-track"><div class="vbar-fill" style="height:'+Math.max(4,Math.min(100,s))+'%"></div></div><div class="vbar-label">'+esc(v.name)+'</div></div>';
    }).join('');

    const byRevenue=rows.filter(r=>r.revenueRecorded&&num(r.revenue)>0).sort((a,b)=>num(b.revenue)-num(a.revenue)).slice(0,6);
    const projectRows=byRevenue.map(r=>{
      const rev=num(r.revenue), cost=r.invoiceRecorded?num(r.invoice):0, m=rev?((rev-cost)/rev)*100:null;
      const bar=m==null?0:Math.max(0,Math.min(100,m));
      const status=String(r.statusLabel||'').replace(/\b\w/g,c=>c.toUpperCase());
      return '<tr><td><strong>'+esc(r.name||'Untitled')+'</strong></td><td>'+esc(r.owner||'—')+'</td><td>'+esc(status||'—')+'</td><td>'+money(rev)+'</td><td>'+pct(m)+'</td><td><div class="tiny-track"><div style="width:'+bar+'%"></div></div></td></tr>';
    }).join('');

    const invoiceBuckets=[
      ['Recorded',rows.filter(r=>r.invoiceRecorded).length,'good'],
      ['Missing',rows.filter(r=>!r.invoiceRecorded).length,'warn'],
      ['Customer Invoices',invoiceCount,'blue'],
      ['Scorecards',scorecardCount,'purple']
    ];
    const invoiceCards=invoiceBuckets.map(x=>'<div class="aging-card '+x[2]+'"><span>'+esc(x[0])+'</span><strong>'+Number(x[1]).toLocaleString()+'</strong><small>records</small></div>').join('');

    const costBars=rows.filter(r=>r.invoiceRecorded&&num(r.invoice)>0).sort((a,b)=>num(b.invoice)-num(a.invoice)).slice(0,6).map(r=>{
      const c=num(r.invoice);
      const max=Math.max(1,...rows.filter(x=>x.invoiceRecorded).map(x=>num(x.invoice)));
      return '<div class="hbar-row"><span>'+esc(r.name||'Task')+'</span><div class="hbar"><i style="width:'+((c/max)*100).toFixed(1)+'%"></i></div><b>'+money(c)+'</b></div>';
    }).join('');

    const summary=[
      ['Revenue Invoiced',money(revenue),'blue'],
      ['Vendor Cost',money(vendorCost),'green'],
      ['Installation Margin',pct(margin),'cyan'],
      ['Active Projects',active.toLocaleString(),'blue'],
      ['Vendor Quality',overall==null?'—':overall.toFixed(1),'teal'],
      ['Customer Invoices',invoiceCount.toLocaleString(),'purple']
    ].map(x=>'<div class="quick-item"><span class="quick-dot '+x[2]+'"></span><div><b>'+esc(x[0])+'</b><strong>'+esc(x[1])+'</strong></div></div>').join('');

    const shell=document.createElement('div');
    shell.id='mbr-reference-shell';
    shell.innerHTML=`<div class="mbr-wrap">
      <aside class="mbr-rail">
        <div class="brand"><div class="brand-mark">V</div><div><div class="eyebrow">VUSION</div><h1>Executive MBR Dashboard</h1><p>Live ClickUp operational view</p></div></div>
        <div class="rail-card"><h3>Quick Summary</h3>${summary}</div>
        <div class="rail-card disclaimer"><span>ⓘ</span><p>Metrics are built from the current ClickUp data set and vendor scorecards. Layout is modeled on the provided executive MBR reference.</p></div>
      </aside>
      <main class="mbr-main">
        <div class="mbr-topline"><div><div class="eyebrow">EXECUTIVE MONTHLY BUSINESS REVIEW</div><h2>Vendor & Installation Performance</h2><p>Operational performance, vendor quality, cost exposure and invoice activity</p></div><div class="asof"><span>DATA AS OF</span><strong>${updated.toLocaleDateString()}</strong><small>ClickUp + Vendor Scorecards</small></div></div>
        <section class="kpi-strip">
          <div class="mbr-kpi blue"><span>Revenue Invoiced</span><strong>${money(revenue)}</strong><small>Live customer invoice data</small></div>
          <div class="mbr-kpi green"><span>Installation Margin</span><strong>${pct(margin)}</strong><small>Revenue less vendor cost</small></div>
          <div class="mbr-kpi cyan"><span>Active Projects</span><strong>${active.toLocaleString()}</strong><small>Current active ClickUp items</small></div>
          <div class="mbr-kpi lime"><span>Vendors Active</span><strong>${vendors.length}</strong><small>Current scorecards</small></div>
          <div class="mbr-kpi teal"><span>Avg Vendor Quality</span><strong>${overall==null?'—':overall.toFixed(1)}</strong><small>Overall vendor score</small></div>
          <div class="mbr-kpi orange"><span>Vendor Invoices</span><strong>${money(vendorCost)}</strong><small>Recorded vendor cost</small></div>
          <div class="mbr-kpi purple"><span>Customer Invoices</span><strong>${invoiceCount}</strong><small>Invoice-recorded tasks</small></div>
          <div class="mbr-kpi white"><span>Scorecards</span><strong>${scorecardCount}</strong><small>Live vendor scorecards</small></div>
        </section>
        <section class="grid-3">
          <article class="panel vendor-panel"><header><div><h3>Vendor Scorecard</h3><p>Current vendor quality and scorecard status</p></div><span class="panel-tag">LIVE</span></header><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Quality<br>(100 pt)</th><th>Projects</th><th>Data</th><th>Status</th></tr></thead><tbody>${vendorTable}</tbody></table></div></article>
          <article class="panel chart-panel"><header><div><h3>Vendor Quality Score</h3><p>Overall average ${overall==null?'—':overall.toFixed(1)}</p></div></header><div class="vbar-chart">${vendorBars}</div><div class="chart-foot">Score target: 90+</div></article>
          <article class="panel chart-panel"><header><div><h3>Vendor Cost Exposure</h3><p>Top recorded vendor invoice amounts</p></div></header><div class="hbars">${costBars||'<div class="empty">No vendor invoice values recorded</div>'}</div><div class="chart-foot">Total vendor cost: ${money(vendorCost)}</div></article>
        </section>
        <section class="grid-3 lower">
          <article class="panel project-panel"><header><div><h3>Projects Overview</h3><p>Highest customer-invoiced active work</p></div></header><div class="table-wrap"><table><thead><tr><th>Project / Task</th><th>Owner</th><th>Status</th><th>Revenue</th><th>Margin</th><th>Profile</th></tr></thead><tbody>${projectRows||'<tr><td colspan="6" class="empty">No invoice-recorded tasks available</td></tr>'}</tbody></table></div></article>
          <article class="panel chart-panel"><header><div><h3>Installation Margin by Project</h3><p>Revenue less recorded vendor cost</p></div></header><div class="margin-bars">${byRevenue.map(r=>{const rev=num(r.revenue),cost=r.invoiceRecorded?num(r.invoice):0,m=rev?((rev-cost)/rev)*100:null;const h=m==null?0:Math.max(4,Math.min(100,m));return '<div class="mb"><div class="mb-value">'+pct(m)+'</div><div class="mb-track"><div style="height:'+h+'%"></div></div><div class="mb-label">'+esc((r.name||'Project').slice(0,16))+'</div></div>';}).join('')||'<div class="empty">No margin data available</div>'}</div><div class="chart-foot">Portfolio margin: ${pct(margin)}</div></article>
          <article class="panel aging-panel"><header><div><h3>Invoice & Data Coverage</h3><p>Current dashboard data completeness</p></div></header><div class="aging-grid">${invoiceCards}</div><div class="top-list"><h4>Top Invoiced Items</h4>${byRevenue.slice(0,5).map(r=>'<div><span>'+esc(r.name||'Task')+'</span><b>'+money(num(r.revenue))+'</b></div>').join('')||'<div class="empty">No customer invoice values recorded</div>'}</div></article>
        </section>
        <div class="mbr-foot"><span>Vendor Dashboard</span><span>Data as of ${updated.toLocaleDateString()}</span><span>ClickUp / Vendor Scorecards</span></div>
      </main>
    </div>`;

    document.body.insertBefore(shell,document.body.firstChild);
    const old=document.querySelector('.app');
    if(old) old.style.display='none';
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
</script>`;

const CSS = `<style id="reference-dashboard-style">
#mbr-reference-shell{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#eef5ff;background:#020914;min-height:100vh;position:relative;z-index:10}
#mbr-reference-shell *{box-sizing:border-box}
.mbr-wrap{display:grid;grid-template-columns:300px minmax(0,1fr);min-height:100vh;background:radial-gradient(circle at 82% 0%,rgba(54,126,255,.10),transparent 28%),linear-gradient(180deg,#07111d,#020814)}
.mbr-rail{padding:14px 12px;border-right:1px solid rgba(132,166,210,.14);background:linear-gradient(180deg,#06101b,#030a12);display:flex;flex-direction:column;gap:12px}
.brand{display:flex;gap:12px;align-items:center;padding:8px 8px 10px}.brand-mark{width:46px;height:46px;border-radius:14px;background:linear-gradient(160deg,#177cff,#0052d9);display:grid;place-items:center;font-size:26px;font-weight:900;color:#fff;box-shadow:0 10px 24px rgba(23,124,255,.28)}
.eyebrow{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#35d5ff;font-weight:800}.brand h1{margin:4px 0;font-size:24px;line-height:1.02;letter-spacing:-.045em}.brand p{margin:0;color:#71849c;font-size:11px}
.rail-card{border:1px solid rgba(132,166,210,.16);background:linear-gradient(160deg,rgba(9,24,41,.98),rgba(4,14,25,.98));border-radius:14px;padding:13px;box-shadow:0 12px 34px rgba(0,0,0,.22)}.rail-card h3{margin:0 0 12px;font-size:14px}.quick-item{display:flex;gap:9px;align-items:center;padding:8px 2px;border-top:1px solid rgba(132,166,210,.08)}.quick-item:first-of-type{border-top:0}.quick-dot{width:10px;height:10px;border-radius:50%;box-shadow:0 0 14px currentColor}.quick-dot.blue{color:#2f84ff;background:#2f84ff}.quick-dot.green{color:#3ed57b;background:#3ed57b}.quick-dot.cyan{color:#1de0e0;background:#1de0e0}.quick-dot.teal{color:#23d4c8;background:#23d4c8}.quick-dot.purple{color:#a66cff;background:#a66cff}.quick-item b{display:block;color:#8fa2b9;font-size:10px;font-weight:700}.quick-item strong{display:block;color:#f4f8ff;font-size:15px;line-height:1.05;margin-top:2px}.disclaimer{margin-top:auto;display:flex;gap:8px;align-items:flex-start}.disclaimer span{color:#2fb2ff}.disclaimer p{margin:0;color:#71839a;font-size:10px;line-height:1.4}
.mbr-main{padding:14px 16px 10px}.mbr-topline{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}.mbr-topline h2{margin:4px 0 4px;font-size:27px;line-height:1;letter-spacing:-.04em}.mbr-topline p{margin:0;color:#7990a9;font-size:11px}.asof{min-width:150px;border:1px solid rgba(132,166,210,.14);background:rgba(7,20,34,.76);border-radius:12px;padding:10px 12px;text-align:right}.asof span{display:block;color:#6f8399;font-size:8px;letter-spacing:.15em}.asof strong{display:block;font-size:13px;margin-top:3px}.asof small{color:#6f8399;font-size:9px}
.kpi-strip{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin-bottom:10px}.mbr-kpi{border:1px solid rgba(132,166,210,.15);background:linear-gradient(160deg,rgba(11,28,48,.98),rgba(5,16,29,.98));border-radius:11px;padding:11px 12px;min-height:84px;box-shadow:0 9px 24px rgba(0,0,0,.16);position:relative;overflow:hidden}.mbr-kpi:before{content:'';position:absolute;left:0;top:0;width:3px;height:100%;background:#2f84ff}.mbr-kpi.green:before{background:#3ed57b}.mbr-kpi.cyan:before{background:#18d7d3}.mbr-kpi.lime:before{background:#8ee35b}.mbr-kpi.teal:before{background:#2bd7cc}.mbr-kpi.orange:before{background:#ff922f}.mbr-kpi.purple:before{background:#a76bff}.mbr-kpi.white:before{background:#d9e6f7}.mbr-kpi span{display:block;color:#91a3ba;font-size:9px;letter-spacing:.06em}.mbr-kpi strong{display:block;font-size:22px;letter-spacing:-.04em;margin:10px 0 4px}.mbr-kpi small{color:#667c94;font-size:8px}
.grid-3{display:grid;grid-template-columns:1.52fr .72fr .88fr;gap:10px}.grid-3.lower{margin-top:10px;grid-template-columns:1.48fr .78fr .86fr}.panel{border:1px solid rgba(132,166,210,.15);background:linear-gradient(160deg,rgba(9,24,41,.98),rgba(4,14,25,.98));border-radius:13px;box-shadow:0 12px 34px rgba(0,0,0,.20);overflow:hidden;min-width:0}.panel header{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;padding:11px 12px 8px;border-bottom:1px solid rgba(132,166,210,.08)}.panel header h3{margin:0;font-size:14px;letter-spacing:-.02em}.panel header p{margin:3px 0 0;color:#72869e;font-size:9px}.panel-tag{font-size:8px;color:#2cdbff;background:rgba(44,219,255,.08);border:1px solid rgba(44,219,255,.15);padding:4px 6px;border-radius:999px}
.table-wrap{overflow:auto}.table-wrap table{width:100%;border-collapse:collapse;min-width:480px}.table-wrap th,.table-wrap td{padding:9px 8px;border-bottom:1px solid rgba(132,166,210,.08);font-size:9px;text-align:left;vertical-align:middle}.table-wrap th{color:#6f859d;font-size:8px;letter-spacing:.1em;text-transform:uppercase;font-weight:800}.table-wrap td{color:#dce6f5}.table-wrap td strong{font-size:10px;color:#f4f7fb}.table-wrap td small{display:block;color:#6b8097;font-size:8px;margin-top:2px}.score-cell{font-weight:900;color:#4fa9ff!important}.status{display:inline-block;font-size:7px;line-height:1;padding:5px 6px;border-radius:6px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.status.green{color:#83f0a2;background:rgba(57,212,111,.09);border:1px solid rgba(57,212,111,.22)}.status.watch{color:#ffc45f;background:rgba(255,196,95,.09);border:1px solid rgba(255,196,95,.22)}.status.risk{color:#ff7b7b;background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.22)}
.vbar-chart{height:250px;display:flex;align-items:flex-end;gap:8px;padding:18px 12px 4px;border-bottom:1px solid rgba(132,166,210,.08)}.vbar{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end}.vbar-value{font-size:8px;font-weight:900;color:#eaf2ff}.vbar-track{height:190px;width:24px;background:rgba(255,255,255,.05);border-radius:6px 6px 2px 2px;overflow:hidden;display:flex;align-items:flex-end}.vbar-fill{width:100%;background:linear-gradient(180deg,#2f88ff,#1761df);border-radius:6px 6px 0 0}.vbar-label{font-size:7px;color:#7d91a7;text-align:center;line-height:1.15;min-height:22px;word-break:break-word}.chart-foot{padding:7px 10px;color:#647990;font-size:8px}
.hbars{padding:13px 12px 6px}.hbar-row{display:grid;grid-template-columns:90px 1fr 48px;gap:6px;align-items:center;margin:10px 0}.hbar-row span{font-size:8px;color:#a5b6ca;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hbar{height:8px;background:rgba(255,255,255,.05);border-radius:999px;overflow:hidden}.hbar i{display:block;height:100%;background:linear-gradient(90deg,#2f88ff,#2d67ee);border-radius:999px}.hbar-row b{font-size:8px;text-align:right;color:#edf4ff}.empty{padding:22px;color:#6d8299;text-align:center;font-size:10px}
.project-panel{min-height:330px}.tiny-track{height:7px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden}.tiny-track>div{height:100%;background:linear-gradient(90deg,#3bb0ff,#1d73ff)}.margin-bars{height:250px;display:flex;align-items:flex-end;gap:9px;padding:16px 12px 6px;border-bottom:1px solid rgba(132,166,210,.08)}.mb{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px}.mb-value{font-size:8px;color:#dbe7f6}.mb-track{height:190px;width:24px;background:rgba(255,255,255,.04);border-radius:6px;overflow:hidden;display:flex;align-items:flex-end}.mb-track>div{width:100%;background:linear-gradient(180deg,#2dd3cb,#19a79f);border-radius:6px 6px 0 0}.mb-label{font-size:7px;color:#778ba3;text-align:center;line-height:1.15;max-width:48px}.aging-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:12px}.aging-card{border:1px solid rgba(132,166,210,.12);border-radius:9px;padding:10px;background:rgba(255,255,255,.015)}.aging-card span{display:block;font-size:8px;color:#8ea2ba}.aging-card strong{display:block;font-size:17px;margin-top:4px}.aging-card small{display:block;font-size:7px;color:#5e738d;margin-top:2px}.aging-card.good strong{color:#78e69d}.aging-card.warn strong{color:#ffd06a}.aging-card.blue strong{color:#4da3ff}.aging-card.purple strong{color:#aa75ff}.top-list{padding:0 12px 12px}.top-list h4{margin:0 0 7px;color:#bccde1;font-size:10px}.top-list>div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid rgba(132,166,210,.07);font-size:8px}.top-list span{color:#93a6bc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.top-list b{color:#edf4ff}.mbr-foot{display:flex;justify-content:flex-end;gap:16px;padding:7px 2px;color:#5f738b;font-size:8px}
@media(max-width:1500px){.mbr-wrap{grid-template-columns:260px minmax(0,1fr)}.kpi-strip{grid-template-columns:repeat(4,minmax(0,1fr))}.grid-3,.grid-3.lower{grid-template-columns:1fr 1fr}.vendor-panel{grid-row:span 2}.chart-panel{min-height:280px}}
@media(max-width:950px){.mbr-wrap{grid-template-columns:1fr}.mbr-rail{display:none}.kpi-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-3,.grid-3.lower{grid-template-columns:1fr}.mbr-topline{flex-direction:column}.asof{text-align:left}}
@media(max-width:560px){.mbr-main{padding:10px}.kpi-strip{grid-template-columns:1fr}.mbr-topline h2{font-size:23px}.mbr-kpi strong{font-size:20px}}
</style>`;

async function main(){
  let html=await fs.readFile(filePath,'utf8');
  const injection=CSS+SCRIPT;
  if(html.includes('id="reference-dashboard-style"')) return;
  if(html.includes('</head>')) html=html.replace('</head>',injection+'</head>');
  else html=injection+html;
  await fs.writeFile(filePath,html,'utf8');
  console.log('Added reference-style executive MBR dashboard shell.');
}

main().catch(err=>{console.error(err);process.exit(1);});
