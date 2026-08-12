const scorecards=[
 {vendor:'SASR',score:100,records:3,source:'Scorecard Average Calculator'},
 {vendor:'Channel Partners',score:null,records:4,source:'Scorecard records'},
 {vendor:'Anderson',score:null,records:7,source:'Scorecard records'},
 {vendor:'Impulso',score:null,records:2,source:'Scorecard records'},
 {vendor:'B2X',score:null,records:1,source:'Scorecard record'},
 {vendor:'Food 4 Less',score:null,records:1,source:'Scorecard record'},
 {vendor:'Miniso',score:null,records:1,source:'Scorecard record'},
 {vendor:'Natural Grocers',score:null,records:1,source:'Scorecard record'}
];

const invoiceStages=[
 {label:'Pending vendor invoice',count:0},
 {label:'Ready for OTB reception',count:0},
 {label:'Complete',count:0}
];

const workQueue=[
 ['Family Dollar (Pilot)','New White Glove Installations','vendor po to issue','Vendor PO / scheduling'],
 ['Rexall Multi Store Pilot','Installations Main Tracker','prospective project','Planning'],
 ['iShoppes JFK','Installations Main Tracker','prospective project','Planning'],
 ['The Fresh Market','Installations Main Tracker','prospective project','Planning'],
 ['Import all Invoice/Cost into Clickup','Objectives','installation to request','Financial data workstream'],
 ['OxxO 2nd Visit Quality (10MON)','Installations Main Tracker','not reported','Quality / status review'],
 ['WMUS Top Stock Gen 2','Installations Main Tracker','not reported','Status review'],
 ['SASR','Installations Main Tracker','not reported','Operational follow-up']
];

const esc=(v)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scored=scorecards.filter(x=>x.score!==null);
const avgQuality=scored.length?Math.round(scored.reduce((a,x)=>a+x.score,0)/scored.length):null;
const refresh='Aug 12, 2026 • 12:05 PM CT';

function renderKpis(){
 const data=[
  ['Installation Quality Score',avgQuality===null?'—':avgQuality+'%',`${scored.length} of ${scorecards.length} vendor programs scored`,'Q','good'],
  ['Vendor Performance Scorecards',scorecards.length,'Active vendor programs in Scorecards','V','good'],
  ['Service Revenue','—','Financial field mapping required','$','warn'],
  ['Vendor Invoices','—','Invoice amount/status mapping required','$','warn']
 ];
 document.getElementById('topKpis').innerHTML=data.map(([l,v,d,i,s])=>`<article class="kpi"><div class="kpi-label"><span class="icon">${i}</span>${esc(l)}</div><div class="value">${esc(v)}</div><div class="detail ${s==='warn'?'warn':''}">${esc(d)}</div></article>`).join('');
}

function renderSource(){
 document.getElementById('sourceSummary').innerHTML=`
  <div class="side-row"><span>Workspace</span><strong>Field</strong></div>
  <div class="side-row"><span>List</span><strong>Scorecards</strong></div>
  <div class="side-row"><span>Programs</span><strong>${scorecards.length}</strong></div>
  <div class="side-row"><span>Refresh</span><strong>${refresh}</strong></div>`;
}

function renderVendors(){
 document.getElementById('vendorGrid').innerHTML=scorecards.map(v=>{
  const has=v.score!==null;
  return `<article class="vendor-card">
   <div class="vendor-top"><div><div class="vendor-name">${esc(v.vendor)}</div><div class="vendor-meta">${v.records} linked scorecard record${v.records===1?'':'s'}</div></div><span class="badge ${has?'good':'pending'}">${has?'SCORED':'PENDING'}</span></div>
   <div class="score-box"><div class="score-label"><span>Installation quality</span><span>${has?'Calculated':'Awaiting data'}</span></div><div class="score ${has?'':'na'}">${has?v.score+'%':'—'}</div><div class="bar"><span style="width:${has?v.score:0}%"></span></div></div>
   <div class="vendor-foot">${esc(v.source)}</div>
  </article>`;
 }).join('');
}

function renderQuality(){
 const el=document.getElementById('qualityPanel');
 el.innerHTML=`<div class="quality-top"><div><div class="quality-average">${avgQuality===null?'—':avgQuality+'%'}</div><div class="eyebrow">AVERAGE AVAILABLE SCORE</div></div><div class="quality-note">Only calculated quality scores are shown as numeric values. Missing score fields are not estimated.</div></div>`+
 scorecards.map(v=>`<div class="quality-row"><div><div class="qname">${esc(v.vendor)}</div><div class="qtrack"><span style="width:${v.score||0}%"></span></div></div><div class="qscore">${v.score===null?'—':v.score+'%'}</div></div>`).join('');
}

function renderInvoices(){
 const counts=invoiceStages.map(x=>x.count);
 document.getElementById('invoicePanel').innerHTML=`<div class="invoice-stats">
  <div class="invoice-stat"><span>Total invoice value</span><strong>—</strong></div>
  <div class="invoice-stat"><span>Pending invoices</span><strong>${counts[0]}</strong></div>
  <div class="invoice-stat"><span>Vendors tracked</span><strong>${scorecards.length}</strong></div>
 </div>
 <table class="invoice-table"><thead><tr><th>Workflow</th><th>Count</th><th>Amount</th></tr></thead><tbody>
 ${invoiceStages.map(x=>`<tr><td>${esc(x.label)}</td><td>${x.count}</td><td>—</td></tr>`).join('')}
 </tbody></table>`;
}

function renderQueue(){
 document.getElementById('workQueue').innerHTML=workQueue.map(([name,list,status,action])=>{
  const cls=status.includes('prospective')?'status-green':status.includes('vendor po')?'status-amber':'status-red';
  return `<tr><td>${esc(name)}</td><td>${esc(list)}</td><td><span class="status ${cls}">${esc(status)}</span></td><td>${esc(action)}</td></tr>`;
 }).join('');
}

function init(){
 renderKpis();renderSource();renderVendors();renderQuality();renderInvoices();renderQueue();
 document.getElementById('footer').innerHTML=`Source: <strong>ClickUp Field / Scorecards</strong> • Refreshed ${refresh}. Numeric financial KPIs are intentionally blank until the underlying ClickUp custom fields are mapped.`;
}

document.addEventListener('DOMContentLoaded',init);
