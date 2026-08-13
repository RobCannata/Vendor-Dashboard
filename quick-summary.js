document.addEventListener('DOMContentLoaded',()=>{
  const sidebar=document.querySelector('.sidebar');
  if(!sidebar||sidebar.querySelector('.quick-summary')) return;
  const nav=sidebar.querySelector('.side-nav');
  const card=document.createElement('section');
  card.className='quick-summary';
  card.innerHTML=`<div class="quick-summary-title">Quick Summary</div>
    <div class="quick-metric"><span class="quick-icon quality">Q</span><div><div class="quick-label">Installation Quality</div><strong id="quickQuality">—</strong><small id="quickQualityDetail">Loading…</small></div></div>
    <div class="quick-metric"><span class="quick-icon vendors">V</span><div><div class="quick-label">Vendor Scorecards</div><strong id="quickVendors">5</strong><small id="quickVendorsDetail">Current parent scorecards</small></div></div>
    <div class="quick-metric"><span class="quick-icon revenue">$</span><div><div class="quick-label">Customer Invoices</div><strong id="quickRevenue">—</strong><small id="quickRevenueDetail">Selected period</small></div></div>
    <div class="quick-metric"><span class="quick-icon cost">$</span><div><div class="quick-label">Vendor Invoices</div><strong id="quickVendorCost">—</strong><small id="quickVendorCostDetail">Selected period</small></div></div>
    <div class="quick-metric"><span class="quick-icon margin">%</span><div><div class="quick-label">Gross Margin</div><strong id="quickMargin">—</strong><small id="quickMarginDetail">Selected period</small></div></div>`;
  if(nav) nav.after(card); else sidebar.appendChild(card);

  const style=document.createElement('style');
  style.textContent=`
    .quick-summary{margin-top:10px;padding:12px 10px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:#17365D!important;color:#fff}
    .quick-summary-title{font-size:13px;font-weight:800;margin:0 8px 9px;color:#fff}
    .quick-metric{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:center;padding:8px 6px;border-top:1px solid rgba(255,255,255,.09)}
    .quick-icon{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:900;background:rgba(255,255,255,.14);color:#fff}
    .quick-label{font-size:9px;line-height:1.15;color:rgba(255,255,255,.78);font-weight:700;text-transform:none}
    .quick-metric strong{display:block;font-size:18px;line-height:1.05;color:#fff;margin-top:2px;letter-spacing:-.2px}
    .quick-metric small{display:block;margin-top:3px;font-size:8px;line-height:1.15;color:rgba(255,255,255,.62)}
    .quick-summary .quality{background:rgba(47,85,151,.45)}
    .quick-summary .vendors{background:rgba(31,157,85,.38)}
    .quick-summary .revenue{background:rgba(47,85,151,.45)}
    .quick-summary .cost{background:rgba(183,121,31,.42)}
    .quick-summary .margin{background:rgba(31,157,85,.38)}
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
    const label=new Date(2026,end-1,1).toLocaleString('en-US',{month:'short',year:'numeric'});
    document.getElementById('quickQuality').textContent=avg==null?'—':`${avg}%`;
    document.getElementById('quickQualityDetail').textContent=`${score.length} vendors scored`;
    document.getElementById('quickRevenue').textContent=money(revenue);
    document.getElementById('quickRevenueDetail').textContent=label+' Customer Invoice';
    document.getElementById('quickVendorCost').textContent=money(vendor);
    document.getElementById('quickVendorCostDetail').textContent=label+' Vendor Invoice';
    document.getElementById('quickMargin').textContent=money(margin);
    document.getElementById('quickMarginDetail').textContent=pct==null?'No revenue':`${pct.toFixed(1)}% margin • ${label}`;
  };
  window.addEventListener('load',()=>[0,400,1200,2200].forEach(ms=>setTimeout(paint,ms)));
  document.getElementById('reportMonthSummary')?.addEventListener('change',paint);
});
