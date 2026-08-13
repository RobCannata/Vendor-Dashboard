document.addEventListener('DOMContentLoaded',()=>{
  const sidebar=document.querySelector('.sidebar');
  if(!sidebar||sidebar.querySelector('.quick-summary')) return;
  const nav=sidebar.querySelector('.side-nav');
  const card=document.createElement('section');
  card.className='quick-summary';
  const spark=(d,cls='navy')=>`<svg class="quick-spark ${cls}" viewBox="0 0 72 24" aria-hidden="true"><polyline points="1,19 9,17 17,19 25,11 33,14 41,8 49,13 57,5 65,11 71,8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  card.innerHTML=`<div class="quick-summary-title">Quick Summary</div>
    <div class="quick-metric"><span class="quick-icon margin">%</span><div><div class="quick-label">Installation Margin</div><strong id="quickMarginPct">—</strong><small id="quickMarginPctDetail">Selected period</small></div>${spark('','green')}</div>
    <div class="quick-metric"><span class="quick-icon revenue">$</span><div><div class="quick-label">Revenue Invoiced</div><strong id="quickRevenue">—</strong><small id="quickRevenueDetail">Customer Invoice</small></div>${spark('','navy')}</div>
    <div class="quick-metric"><span class="quick-icon projects">P</span><div><div class="quick-label">Active Projects</div><strong id="quickProjects">12</strong><small id="quickProjectsDetail">Current project portfolio</small></div>${spark('','navy')}</div>
    <div class="quick-metric"><span class="quick-icon vendors">V</span><div><div class="quick-label">Vendors Active</div><strong id="quickVendors">5</strong><small id="quickVendorsDetail">Current vendor partners</small></div>${spark('','green')}</div>
    <div class="quick-metric"><span class="quick-icon quality">Q</span><div><div class="quick-label">Avg Vendor Quality Score</div><strong id="quickQuality">—</strong><small id="quickQualityDetail">ClickUp scorecards</small></div>${spark('','green')}</div>
    <div class="quick-metric"><span class="quick-icon open-invoices">$</span><div><div class="quick-label">Open Customer Invoices</div><strong id="quickOpenInvoices">—</strong><small id="quickOpenInvoicesDetail">Customer Invoice records</small></div>${spark('','purple')}</div>
    <div class="quick-metric"><span class="quick-icon csat">★</span><div><div class="quick-label">Customer CSAT</div><strong id="quickCsat">—</strong><small id="quickCsatDetail">ClickUp mapping required</small></div>${spark('','purple')}</div>`;
  if(nav) nav.after(card); else sidebar.appendChild(card);

  const style=document.createElement('style');
  style.textContent=`
    .quick-summary{margin-top:10px;padding:12px 10px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:#17365D!important;color:#fff}
    .quick-summary-title{font-size:13px;font-weight:800;margin:0 8px 9px;color:#fff}
    .quick-metric{display:grid;grid-template-columns:28px minmax(0,1fr) 74px;gap:8px;align-items:center;padding:9px 6px;border-top:1px solid rgba(255,255,255,.09)}
    .quick-icon{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:900;background:rgba(255,255,255,.14);color:#fff}
    .quick-label{font-size:9px;line-height:1.15;color:rgba(255,255,255,.78);font-weight:700}
    .quick-metric strong{display:block;font-size:18px;line-height:1.05;color:#fff;margin-top:2px;letter-spacing:-.25px;white-space:nowrap}
    .quick-metric small{display:block;margin-top:3px;font-size:8px;line-height:1.15;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .quick-spark{width:72px;height:24px;justify-self:end;opacity:.95}.quick-spark.navy{color:#60A5FA}.quick-spark.green{color:#52C878}.quick-spark.purple{color:#A78BFA}
    .quick-summary .margin{background:rgba(31,157,85,.38)}.quick-summary .revenue{background:rgba(47,85,151,.42)}.quick-summary .projects{background:rgba(47,85,151,.42)}.quick-summary .vendors{background:rgba(31,157,85,.38)}.quick-summary .quality{background:rgba(31,157,85,.38)}.quick-summary .open-invoices{background:rgba(183,121,31,.42)}.quick-summary .csat{background:rgba(124,92,191,.36)}
    @media(max-width:1100px){.quick-metric{grid-template-columns:28px minmax(0,1fr)}.quick-spark{display:none}}
    @media(max-width:900px){.quick-summary{display:none}}
  `;
  document.head.appendChild(style);

  const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v)||0);
  const paint=()=>{
    const payload=window.__clickUpFinancePayload;
    const select=document.getElementById('reportMonthSummary');
    if(!payload||!select) return;
    const [countRaw,endRaw]=String(select.value||'1|8').split('|');
    const count=Number(countRaw)||1; const end=Number(endRaw)||8; const start=Math.max(1,end-count+1);
    const keys=Array.from({length:end-start+1},(_,i)=>`2026-${String(start+i).padStart(2,'0')}`);
    const revenueRows=(payload.customerInvoices||[]).filter(r=>keys.includes(r.month));
    const vendorRows=(payload.invoices||[]).filter(r=>keys.includes(r.month));
    const revenue=revenueRows.reduce((s,r)=>s+Number(r.amount||0),0);
    const vendor=vendorRows.reduce((s,r)=>s+Number(r.amount||0),0);
    const margin=revenue-vendor; const pct=revenue?(margin/revenue*100):null;
    const score=Object.values(payload.scores||{}).map(Number).filter(Number.isFinite);
    const avg=score.length?Math.round(score.reduce((a,b)=>a+b,0)/score.length):null;
    const projectCount=12;
    const vendorCount=Object.keys(payload.scores||{}).length||5;
    document.getElementById('quickMarginPct').textContent=pct==null?'—':`${pct.toFixed(1)}%`;
    document.getElementById('quickMarginPctDetail').textContent=`${money(margin)} gross margin`;
    document.getElementById('quickRevenue').textContent=money(revenue);
    document.getElementById('quickRevenueDetail').textContent=`${revenueRows.length} Customer Invoice record${revenueRows.length===1?'':'s'}`;
    document.getElementById('quickProjects').textContent=String(projectCount);
    document.getElementById('quickVendors').textContent=String(vendorCount);
    document.getElementById('quickQuality').textContent=avg==null?'—':`${avg}%`;
    document.getElementById('quickQualityDetail').textContent=`${score.length} vendors scored`;
    document.getElementById('quickOpenInvoices').textContent=money(revenue);
    document.getElementById('quickOpenInvoicesDetail').textContent=`${revenueRows.length} customer invoice record${revenueRows.length===1?'':'s'}`;
    document.getElementById('quickCsat').textContent='—';
    document.getElementById('quickCsatDetail').textContent='ClickUp mapping required';
  };
  window.addEventListener('load',()=>[0,400,1200,2200].forEach(ms=>setTimeout(paint,ms)));
  document.getElementById('reportMonthSummary')?.addEventListener('change',paint);
});
