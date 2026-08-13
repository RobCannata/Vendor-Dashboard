document.addEventListener('DOMContentLoaded',()=>{
  const sidebar=document.querySelector('.sidebar');
  if(!sidebar) return;
  const nav=sidebar.querySelector('.side-nav');
  const existing=sidebar.querySelector('.quick-summary');
  if(existing) existing.remove();

  const card=document.createElement('section');
  card.className='quick-summary';
  card.innerHTML=`<div class="quick-summary-title">Quick Summary</div>
    <div class="quick-metric"><span class="quick-icon margin">%</span><div><div class="quick-label">Installation Margin</div><strong id="quickMarginPct">—</strong><small id="quickMarginPctDetail">Selected period</small></div><div class="quick-trend"><span id="quickMarginDelta" class="quick-delta">—</span><span id="quickMarginSpark"></span></div></div>
    <div class="quick-metric"><span class="quick-icon revenue">$</span><div><div class="quick-label">Revenue Invoiced</div><strong id="quickRevenue">—</strong><small id="quickRevenueDetail">Customer Invoice</small></div><div class="quick-trend"><span id="quickRevenueDelta" class="quick-delta">—</span><span id="quickRevenueSpark"></span></div></div>
    <div class="quick-metric"><span class="quick-icon projects">P</span><div><div class="quick-label">Active Projects</div><strong id="quickProjects">12</strong><small id="quickProjectsDetail">Current project portfolio</small></div><div class="quick-trend"><span id="quickProjectsDelta" class="quick-delta">—</span><span id="quickProjectsSpark"></span></div></div>
    <div class="quick-metric"><span class="quick-icon vendors">V</span><div><div class="quick-label">Vendors Active</div><strong id="quickVendors">5</strong><small id="quickVendorsDetail">Current vendor partners</small></div><div class="quick-trend"><span id="quickVendorsDelta" class="quick-delta">—</span><span id="quickVendorsSpark"></span></div></div>
    <div class="quick-metric"><span class="quick-icon quality">Q</span><div><div class="quick-label">Avg Vendor Quality Score</div><strong id="quickQuality">—</strong><small id="quickQualityDetail">ClickUp scorecards</small></div><div class="quick-trend"><span id="quickQualityDelta" class="quick-delta">—</span><span id="quickQualitySpark"></span></div></div>
    <div class="quick-metric"><span class="quick-icon open-invoices">$</span><div><div class="quick-label">Open Customer Invoices</div><strong id="quickOpenInvoices">—</strong><small id="quickOpenInvoicesDetail">Customer Invoice records</small></div><div class="quick-trend"><span id="quickOpenInvoicesDelta" class="quick-delta">—</span><span id="quickOpenInvoicesSpark"></span></div></div>
    <div class="quick-metric"><span class="quick-icon csat">★</span><div><div class="quick-label">Customer CSAT</div><strong id="quickCsat">—</strong><small id="quickCsatDetail">ClickUp CSAT</small></div><div class="quick-trend"><span id="quickCsatDelta" class="quick-delta">—</span><span id="quickCsatSpark"></span></div></div>`;
  if(nav) nav.after(card); else sidebar.appendChild(card);

  const style=document.createElement('style');
  style.textContent=`
    .quick-summary{margin-top:10px;padding:12px 10px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:#17365D!important;color:#fff}
    .quick-summary-title{font-size:13px;font-weight:800;margin:0 8px 9px;color:#fff}
    .quick-metric{display:grid;grid-template-columns:28px minmax(0,1fr) 92px;gap:8px;align-items:center;padding:9px 6px;border-top:1px solid rgba(255,255,255,.09)}
    .quick-icon{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:900;background:rgba(255,255,255,.14);color:#fff}
    .quick-label{font-size:9px;line-height:1.15;color:rgba(255,255,255,.78);font-weight:700}
    .quick-metric strong{display:block;font-size:18px;line-height:1.05;color:#fff;margin-top:2px;letter-spacing:-.25px;white-space:nowrap}
    .quick-metric small{display:block;margin-top:3px;font-size:8px;line-height:1.15;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .quick-trend{width:92px;display:flex;flex-direction:column;align-items:flex-end;gap:1px}.quick-delta{font-size:8px;font-weight:800;color:#AAB7C7;white-space:nowrap}.quick-delta.good{color:#52C878}.quick-delta.bad{color:#FF7B72}
    .quick-spark{width:84px;height:22px;display:block}.quick-spark polyline{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.quick-spark.navy{color:#60A5FA}.quick-spark.green{color:#52C878}.quick-spark.purple{color:#A78BFA}.quick-spark.gray{color:#98A2B3}
    .quick-summary .margin{background:rgba(31,157,85,.38)}.quick-summary .revenue{background:rgba(47,85,151,.42)}.quick-summary .projects{background:rgba(47,85,151,.42)}.quick-summary .vendors{background:rgba(31,157,85,.38)}.quick-summary .quality{background:rgba(31,157,85,.38)}.quick-summary .open-invoices{background:rgba(183,121,31,.42)}.quick-summary .csat{background:rgba(124,92,191,.36)}
    @media(max-width:1100px){.quick-metric{grid-template-columns:28px minmax(0,1fr)}.quick-trend{display:none}}
    @media(max-width:900px){.quick-summary{display:none}}
  `;
  document.head.appendChild(style);

  const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v)||0);
  const monthKeys=Array.from({length:12},(_,i)=>`2026-${String(i+1).padStart(2,'0')}`);
  const monthLabel=k=>new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleString('en-US',{month:'short'});

  function sparkline(values, cls='navy'){
    const nums=values.filter(v=>Number.isFinite(v));
    if(nums.length<2) return '<svg class="quick-spark gray" viewBox="0 0 84 22" aria-hidden="true"><polyline points="2,18 42,18 82,18"></polyline></svg>';
    const min=Math.min(...nums), max=Math.max(...nums), range=(max-min)||1;
    let points=[]; let idx=0;
    values.forEach((v,i)=>{ if(Number.isFinite(v)){ const x=2 + (i/(values.length-1))*80; const y=19 - ((v-min)/range)*15; points.push(`${x.toFixed(1)},${y.toFixed(1)}`); idx++; }});
    return `<svg class="quick-spark ${cls}" viewBox="0 0 84 22" aria-hidden="true"><polyline points="${points.join(' ')}"></polyline></svg>`;
  }

  function deltaText(current, previous, kind='pct'){
    if(!Number.isFinite(current) || !Number.isFinite(previous)) return {text:'— vs Jul', cls:''};
    if(previous===0){ if(current===0) return {text:'0.0% vs Jul',cls:''}; return {text:'New vs Jul',cls:'good'}; }
    const delta=((current-previous)/Math.abs(previous))*100;
    return {text:`${delta>=0?'+':''}${delta.toFixed(1)}% vs Jul`,cls:delta>=0?'good':'bad'};
  }

  const paint=()=>{
    const payload=window.__clickUpFinancePayload;
    const select=document.getElementById('reportMonthSummary');
    if(!payload||!select) return;
    const [countRaw,endRaw]=String(select.value||'1|8').split('|');
    const count=Number(countRaw)||1; const end=Number(endRaw)||8; const start=Math.max(1,end-count+1);
    const keys=Array.from({length:end-start+1},(_,i)=>`2026-${String(start+i).padStart(2,'0')}`);
    const allCustomer=payload.customerInvoices||[];
    const allVendor=payload.invoices||[];
    const revenueSeries=monthKeys.map(k=>allCustomer.filter(r=>r.month===k).reduce((s,r)=>s+Number(r.amount||0),0));
    const vendorSeries=monthKeys.map(k=>allVendor.filter(r=>r.month===k).reduce((s,r)=>s+Number(r.amount||0),0));
    const marginPctSeries=monthKeys.map((k,i)=>revenueSeries[i]>0?((revenueSeries[i]-vendorSeries[i])/revenueSeries[i])*100:null);
    const invoiceCountSeries=monthKeys.map(k=>allCustomer.filter(r=>r.month===k).length);
    const customerRows=allCustomer.filter(r=>keys.includes(r.month));
    const vendorRows=allVendor.filter(r=>keys.includes(r.month));
    const revenue=customerRows.reduce((s,r)=>s+Number(r.amount||0),0);
    const vendor=vendorRows.reduce((s,r)=>s+Number(r.amount||0),0);
    const margin=revenue-vendor; const pct=revenue?(margin/revenue*100):null;
    const score=Object.values(payload.scores||{}).map(Number).filter(Number.isFinite);
    const avg=score.length?score.reduce((a,b)=>a+b,0)/score.length:null;
    const currentMonthKey=`2026-${String(end).padStart(2,'0')}`;
    const previousMonthNumber=Math.max(1,end-1);
    const previousMonthKey=`2026-${String(previousMonthNumber).padStart(2,'0')}`;
    const prevRevenue=revenueSeries[previousMonthNumber-1]||0;
    const prevVendor=vendorSeries[previousMonthNumber-1]||0;
    const prevMarginPct=marginPctSeries[previousMonthNumber-1];
    const prevInvoiceCount=invoiceCountSeries[previousMonthNumber-1]||0;

    document.getElementById('quickMarginPct').textContent=pct==null?'—':`${pct.toFixed(1)}%`;
    document.getElementById('quickMarginPctDetail').textContent=`${money(margin)} gross margin • ${monthLabel(currentMonthKey)}`;
    const md=deltaText(pct,prevMarginPct); const mdEl=document.getElementById('quickMarginDelta'); mdEl.textContent=md.text; mdEl.className=`quick-delta ${md.cls}`; document.getElementById('quickMarginSpark').innerHTML=sparkline(marginPctSeries,'green');

    document.getElementById('quickRevenue').textContent=money(revenue);
    document.getElementById('quickRevenueDetail').textContent=`${customerRows.length} Customer Invoice record${customerRows.length===1?'':'s'} • ${monthLabel(currentMonthKey)}`;
    const rd=deltaText(revenue,prevRevenue); const rdEl=document.getElementById('quickRevenueDelta'); rdEl.textContent=rd.text; rdEl.className=`quick-delta ${rd.cls}`; document.getElementById('quickRevenueSpark').innerHTML=sparkline(revenueSeries,'navy');

    const projectCount=12; document.getElementById('quickProjects').textContent=String(projectCount); document.getElementById('quickProjectsDelta').textContent='— vs Jul'; document.getElementById('quickProjectsSpark').innerHTML=sparkline(monthKeys.map(()=>projectCount),'navy');

    const vendorCount=Object.keys(payload.scores||{}).length||5; document.getElementById('quickVendors').textContent=String(vendorCount); document.getElementById('quickVendorsDelta').textContent='— vs Jul'; document.getElementById('quickVendorsSpark').innerHTML=sparkline(monthKeys.map(()=>vendorCount),'green');

    document.getElementById('quickQuality').textContent=avg==null?'—':`${avg.toFixed(1)}%`;
    document.getElementById('quickQualityDetail').textContent=`${score.length} vendors scored • ${monthLabel(currentMonthKey)}`;
    document.getElementById('quickQualityDelta').textContent='— vs Jul'; document.getElementById('quickQualitySpark').innerHTML=sparkline(monthKeys.map(()=>avg),'green');

    document.getElementById('quickOpenInvoices').textContent=String(customerRows.length);
    document.getElementById('quickOpenInvoicesDetail').textContent=`Customer Invoice records • ${monthLabel(currentMonthKey)}`;
    const od=deltaText(customerRows.length,prevInvoiceCount); const odEl=document.getElementById('quickOpenInvoicesDelta'); odEl.textContent=od.text; odEl.className=`quick-delta ${od.cls}`; document.getElementById('quickOpenInvoicesSpark').innerHTML=sparkline(invoiceCountSeries,'purple');

    // ClickUp CSAT source: Daily CSAT Summary. July has one valid numeric CSAT of 5.0; August reports 4 – Very Satisfied on Aug 5 and Aug 11. The list's current CSAT field is label-based, so keep the dashboard source-aware rather than inventing values.
    const csatSeries=monthKeys.map(k=>k==='2026-07'?5:(k==='2026-08'?4:null));
    const currentCsat=csatSeries[end-1]; const prevCsat=csatSeries[previousMonthNumber-1];
    document.getElementById('quickCsat').textContent=currentCsat==null?'—':`${currentCsat.toFixed(1)} / 5`;
    document.getElementById('quickCsatDetail').textContent=currentCsat==null?'No numeric CSAT in selected month':`ClickUp • ${monthLabel(currentMonthKey)}`;
    const cd=deltaText(currentCsat,prevCsat); const cdEl=document.getElementById('quickCsatDelta'); cdEl.textContent=cd.text; cdEl.className=`quick-delta ${cd.cls}`; document.getElementById('quickCsatSpark').innerHTML=sparkline(csatSeries,'purple');
  };

  window.addEventListener('load',()=>[0,400,1200,2200].forEach(ms=>setTimeout(paint,ms)));
  document.getElementById('reportMonthSummary')?.addEventListener('change',paint);
});
