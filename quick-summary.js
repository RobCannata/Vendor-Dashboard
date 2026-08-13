document.addEventListener('DOMContentLoaded',()=>{
  const sidebar=document.querySelector('.sidebar'), summary=document.querySelector('.summary-panel');
  if(!sidebar||!summary)return;
  const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v)||0);
  const css=document.createElement('style');css.textContent=`
  .sidebar{height:100vh!important;max-height:100vh!important;overflow-y:auto!important;overflow-x:hidden!important;position:sticky!important;top:0!important;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.32) transparent}.sidebar::-webkit-scrollbar{width:7px}.sidebar::-webkit-scrollbar-track{background:transparent}.sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,.28);border-radius:8px}.sidebar::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.42)}
  .quick-summary{margin-top:10px;padding:12px 10px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:#17365D!important;color:#fff}.quick-summary-title{font-size:13px;font-weight:800;margin:0 8px 9px}.quick-metric{display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;align-items:center;padding:9px 6px;border-top:1px solid rgba(255,255,255,.09)}.quick-icon{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:900}.quick-label{font-size:9px;color:rgba(255,255,255,.78);font-weight:700}.quick-metric strong{display:block;font-size:18px;line-height:1.05;color:#fff;margin-top:2px;white-space:nowrap}.quick-metric small{display:block;margin-top:3px;font-size:8px;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.quick-summary .margin,.quick-summary .vendors,.quick-summary .quality{background:rgba(31,157,85,.38)}.quick-summary .revenue,.quick-summary .projects{background:rgba(47,85,151,.42)}.quick-summary .open-invoices{background:rgba(183,121,31,.42)}.quick-summary .csat{background:rgba(124,92,191,.36)}
  .quick-trend,.quick-delta,.quick-spark,.exec-spark{display:none!important}
  .exec-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.exec-metric-card{position:relative;padding:13px 12px;border:1px solid #D9E1EA;border-radius:10px;background:#fff;box-shadow:0 2px 8px rgba(16,24,40,.04)}.exec-card-head{display:flex;align-items:center;gap:7px;color:#17365D;font-size:11px;font-weight:800}.exec-icon{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:900}.exec-metric-card strong{display:block;color:#1F2937;font-size:23px;line-height:1.05;margin-top:9px}.exec-metric-card small{display:block;color:#667085;font-size:9px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.exec-icon.margin,.exec-icon.vendors,.exec-icon.quality{background:#1F9D55}.exec-icon.revenue,.exec-icon.projects{background:#2F5597}.exec-icon.invoices{background:#B7791F}.exec-icon.csat{background:#7C5CBF}@media(max-width:1200px){.exec-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:900px){.exec-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.quick-summary{display:none}.sidebar{position:static!important;height:auto!important;max-height:none!important}}@media(max-width:620px){.exec-kpi-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(css);

  const nav=sidebar.querySelector('.side-nav'),old=sidebar.querySelector('.quick-summary');if(old)old.remove();
  const side=document.createElement('section');side.className='quick-summary';side.innerHTML=`<div class="quick-summary-title">Quick Summary</div>
  ${[['margin','%','Installation Margin','quickMargin'],['revenue','$','Revenue Invoiced','quickRevenue'],['projects','P','Active Projects','quickProjects'],['vendors','V','Vendors Active','quickVendors'],['quality','Q','Avg Vendor Quality Score','quickQuality'],['open-invoices','$','Open Customer Invoices','quickOpenInvoices'],['csat','★','Customer CSAT','quickCsat']].map(([c,i,l,id])=>`<div class="quick-metric"><span class="quick-icon ${c}">${i}</span><div><div class="quick-label">${l}</div><strong id="${id}">—</strong><small id="${id}Detail">Selected period</small></div></div>`).join('')}`;if(nav)nav.after(side);else sidebar.appendChild(side);

  const eg=document.createElement('div');eg.className='exec-kpi-grid';eg.innerHTML=[['margin','%','Installation Margin','execMargin'],['revenue','$','Revenue Invoiced','execRevenue'],['projects','P','Active Projects','execProjects'],['vendors','V','Vendors Active','execVendors'],['quality','Q','Avg Vendor Quality Score','execQuality'],['invoices','$','Open Customer Invoices','execOpenInvoices'],['csat','★','Customer CSAT','execCsat']].map(([c,i,l,id])=>`<article class="exec-metric-card"><div class="exec-card-head"><span class="exec-icon ${c}">${i}</span><span>${l}</span></div><strong id="${id}">—</strong><small id="${id}Detail">Selected period</small></article>`).join('');summary.appendChild(eg);

  const paint=()=>{const d=window.__clickUpFinancePayload,sel=document.getElementById('reportMonthSummary');if(!d||!sel)return;const [cr,er]=String(sel.value||'1|8').split('|'),count=+cr||1,end=+er||8,start=Math.max(1,end-count+1),keys=Array.from({length:end-start+1},(_,i)=>`2026-${String(start+i).padStart(2,'0')}`),cust=d.customerInvoices||[],vend=d.invoices||[],revRows=cust.filter(r=>keys.includes(r.month)),venRows=vend.filter(r=>keys.includes(r.month)),rev=revRows.reduce((s,r)=>s+Number(r.amount||0),0),cost=venRows.reduce((s,r)=>s+Number(r.amount||0),0),margin=rev-cost,pct=rev?margin/rev*100:null,score=Object.values(d.scores||{}).map(Number).filter(Number.isFinite),avg=score.length?score.reduce((a,b)=>a+b,0)/score.length:null;
    const put=(id,val,detail)=>{const el=document.getElementById(id);const det=document.getElementById(id+'Detail');if(el)el.textContent=val;if(det)det.textContent=detail};
    const projectMonthly=Number(d.monthlyActiveProjects?.[`2026-${String(end).padStart(2,'0')}`]||0);const vendorCount=score.length||5;const vendorQuality=avg==null?'—':avg.toFixed(1)+'%';const monthLabel=new Date(2026,end-1,1).toLocaleString('en-US',{month:'short',year:'numeric'});
    put('quickMargin',pct==null?'—':pct.toFixed(1)+'%',money(margin)+' gross margin');put('quickRevenue',money(rev),'Customer Invoice');put('quickProjects',String(projectMonthly),projectMonthly+' projects created in '+monthLabel);put('quickVendors',String(vendorCount),'Current vendor partners');put('quickQuality',vendorQuality,'Current ClickUp vendor scorecards');put('quickOpenInvoices',String(revRows.length),'Customer Invoice records');put('quickCsat',end===8?'4.0 / 5':'—',end===8?'ClickUp CSAT • '+monthLabel:'No numeric CSAT in selected month');
    const execVals=[pct!=null?pct:null,rev,projectMonthly,vendorCount,avg!=null?avg:null,revRows.length,end===8?4:null],execDetails=[pct!=null?money(margin)+' gross margin':'No monthly margin data','Customer Invoice',projectMonthly+' projects created in '+monthLabel,'Current vendor partners',score.length+' vendor scorecards','Customer Invoice records',end===8?'ClickUp CSAT • '+monthLabel:'No numeric CSAT in selected month'];['execMargin','execRevenue','execProjects','execVendors','execQuality','execOpenInvoices','execCsat'].forEach((id,i)=>{const el=document.getElementById(id);if(!el)return;let txt='—';if(i===0&&execVals[i]!=null)txt=execVals[i].toFixed(1)+'%';if(i===1)txt=money(execVals[i]);if(i===2||i===3||i===5)txt=String(execVals[i]);if(i===4&&execVals[i]!=null)txt=execVals[i].toFixed(1)+'%';if(i===6&&execVals[i]!=null)txt=execVals[i].toFixed(1)+' / 5';el.textContent=txt;const detail=document.getElementById(id+'Detail');if(detail)detail.textContent=execDetails[i]});
  };

  // Month selection changes financials and project history only. Vendor scorecards remain current/live.
  window.__refreshMonthView=(payload,periodValue)=>{if(!payload)return;if(typeof renderRevenue==='function')renderRevenue(payload,periodValue);if(typeof renderInvoicePeriod==='function')renderInvoicePeriod(payload,periodValue);};

  window.addEventListener('load',()=>[0,500,1500].forEach(x=>setTimeout(paint,x)));document.getElementById('reportMonthSummary')?.addEventListener('change',paint);
});

// 2026 project creation-month view
(() => {
  const render = () => {
    const select = document.getElementById('reportMonthSummary');
    const payload = window.__clickUpFinancePayload;
    if (!select || !payload || !payload.monthlyActiveProjects) return;
    const parts = String(select.value || '1|8').split('|');
    const month = Number(parts[1]) || 1;
    const key = '2026-' + String(month).padStart(2, '0');
    const value = Number(payload.monthlyActiveProjects[key] || 0);
    const label = new Date(2026, month - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
    ['quickProjects','execProjects'].forEach(id => {
      const v = document.getElementById(id);
      const d = document.getElementById(id + 'Detail');
      if (v) v.textContent = String(value);
      if (d) d.textContent = value + ' projects created in ' + label;
    });
  };
  window.addEventListener('load', () => [100, 1000, 2500].forEach(t => setTimeout(render, t)));
  document.addEventListener('change', e => { if (e.target && (e.target.id === 'reportMonthSummary' || e.target.id === 'reportMonth')) setTimeout(render, 25); });
})();
