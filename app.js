const clickUpSnapshot={source:'ClickUp',space:'Field',scorecardList:'Scorecards',refreshedAt:'2026-08-12T12:05:00-05:00'};

const scorecards=[
  {vendor:'SASR',parent:'869ed6zn3',score:100,records:3,note:'Score available from Scorecard Average Calculator'},
  {vendor:'Channel Partners',parent:'869d1ete9',score:100,records:5,note:'Scorecard records active'},
  {vendor:'Anderson',parent:'869dmepg4',score:100,records:6,note:'Scorecard records active'},
  {vendor:'Impulso',parent:'869duw9kp',score:null,records:2,note:'Score field not returned in task payload'},
  {vendor:'B2X',parent:'869egpcgz',score:null,records:1,note:'No calculated score returned'}
];

const workQueue=[
  ['Family Dollar (Pilot)','New White Glove Installations','vendor po to issue','Vendor PO action'],
  ['Rexall Multi Store Pilot','Installations Main Tracker','prospective project','Planning'],
  ['iShoppes JFK','Installations Main Tracker','prospective project','Planning'],
  ['The Fresh Market','Installations Main Tracker','prospective project','Planning'],
  ['Import all Invoice/Cost into Clickup','Objectives','installation to request','Financial data workstream'],
  ['OxxO 2nd Visit Quality (10MON)','Installations Main Tracker','not reported','Status not reported'],
  ['WMUS TopStock Gen 2','Installations Main Tracker','not reported','Status not reported'],
  ['SASR','Installations Main Tracker','not reported','Operational task']
];

const vendorInvoices=scorecards.map(v=>({vendor:v.vendor,amount:null,stage:'Not reported',note:'Invoice amount/status not exposed in current Scorecards payload'}));
const scored=scorecards.filter(v=>v.score!==null);
const averageQuality=scored.length?Math.round(scored.reduce((s,v)=>s+v.score,0)/scored.length):null;

const escapeHtml=value=>String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const formatRefresh=iso=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'}).format(new Date(iso));
const clsForStatus=status=>status==='prospective project'?'green':status==='vendor po to issue'?'watch':status==='not reported'?'risk':'stage';

const renderKpis=()=>{
  const data=[
    ['Installation Quality Score',averageQuality!==null?`${averageQuality}%`:'—',`${scored.length} of ${scorecards.length} vendor programs scored`,'Q','good'],
    ['Vendor Performance Scorecards',scorecards.length, 'Active vendor scorecard programs','V','good'],
    ['Service Revenue','—','ClickUp revenue field not mapped','$','warn'],
    ['Vendor Invoices','—','Invoice amount/status not mapped','$','warn']
  ];
  document.getElementById('kpiGrid').innerHTML=data.map(([label,value,detail,icon,state])=>`<article class="kpi"><div class="label"><span class="dot">${icon}</span>${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div><div class="delta ${state==='warn'?'down':''}">${escapeHtml(detail)}</div></article>`).join('');
};

const renderSummary=()=>{
  document.getElementById('summaryList').innerHTML=`
    <div class="summary-item"><div class="summary-icon">V</div><div><div class="summary-label">Scorecard programs</div><div class="summary-value">${scorecards.length}</div><div class="trend">Vendor parents</div></div></div>
    <div class="summary-item"><div class="summary-icon">Q</div><div><div class="summary-label">Quality coverage</div><div class="summary-value">${scored.length}/${scorecards.length}</div><div class="trend">Calculated scores available</div></div></div>
    <div class="summary-item"><div class="summary-icon">◷</div><div><div class="summary-label">Last refresh</div><div class="summary-value">${escapeHtml(formatRefresh(clickUpSnapshot.refreshedAt))}</div><div class="trend">Central time</div></div></div>`;
  document.getElementById('coverageNote').textContent='Vendor scorecard structure is available from the linked ClickUp Scorecards list. Revenue and invoice amounts require custom-field mapping before they can be displayed as financial KPIs.';
};

const renderVendorCards=()=>{
  document.getElementById('vendorCards').innerHTML=scorecards.map(v=>{
    const scoreText=v.score===null?'—':`${v.score}%`;
    const bar=v.score===null?0:v.score;
    return `<article class="vendor-card">
      <div class="vendor-top"><div><div class="vendor-name">${escapeHtml(v.vendor)}</div><div class="vendor-count">${v.records} linked scorecard records</div></div><span class="status ${v.score!==null?'green':'watch'}">${v.score!==null?'Scored':'Pending'}</span></div>
      <div class="score-wrap"><div class="score-label"><span>Installation quality</span><span>${v.score!==null?'Available':'Not mapped'}</span></div><div class="score ${v.score===null?'na':''}">${scoreText}</div><div class="score-bar"><span style="width:${bar}%"></span></div></div>
      <div class="vendor-footer"><span class="mini-status"><span class="mini-dot ${v.score===null?'gray':''}"></span>${v.score!==null?'Calculated':'Awaiting field'}</span><strong>${escapeHtml(v.note)}</strong></div>
    </article>`;
  }).join('');
};

const renderInvoices=()=>{
  const pending='Pending vendor invoice';
  document.getElementById('invoiceSummary').innerHTML=`
    <div class="invoice-tile"><span>Invoice amount</span><strong>—</strong></div>
    <div class="invoice-tile"><span>Invoice stage</span><strong>—</strong></div>
    <div class="invoice-tile"><span>Vendors tracked</span><strong>${scorecards.length}</strong></div>`;
  document.getElementById('invoiceTable').innerHTML=vendorInvoices.map(v=>`<tr><td>${escapeHtml(v.vendor)}</td><td>—</td><td><span class="status watch">${pending}</span></td></tr>`).join('');
};

const renderQuality=()=>{
  document.getElementById('qualitySummary').innerHTML=`<div><div class="quality-average">${averageQuality!==null?averageQuality+'%':'—'}</div><div class="section-label">Average available score</div></div><div class="quality-note">${scored.length} scored vendor programs. Unscored programs remain visible below.</div>`;
  document.getElementById('qualityBars').innerHTML=scorecards.map(v=>`<div class="quality-row"><div><div class="qname">${escapeHtml(v.vendor)}</div><div class="qtrack"><span style="width:${v.score||0}%"></span></div></div><div class="qscore">${v.score===null?'—':v.score+'%'}</div></div>`).join('');
};

const renderRevenue=()=>{
  document.getElementById('revenueNote').textContent='Service revenue cannot be calculated from the currently exposed ClickUp task payload. The workspace contains an invoice/cost import workstream, but the financial fields themselves are not returned by the connected task view.';
};

const renderQueue=()=>{
  document.getElementById('workQueue').innerHTML=workQueue.map(([name,list,status,flag])=>`<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(list)}</td><td><span class="status ${clsForStatus(status)}">${escapeHtml(status)}</span></td><td>${escapeHtml(flag)}</td></tr>`).join('');
};

const renderCoverage=()=>{
  const items=[
    ['Vendor scorecard parents','Available','coverage-good'],
    ['Installation quality score','Partial','coverage-partial'],
    ['Service revenue','Not mapped','coverage-none'],
    ['Vendor invoice amount','Not mapped','coverage-none'],
    ['Vendor invoice status','Not mapped','coverage-none'],
    ['Installation status','Available from task status','coverage-good']
  ];
  document.getElementById('coverageGrid').innerHTML=items.map(([label,status,cls])=>`<div class="coverage-item"><span>${escapeHtml(label)}</span><strong class="${cls}">${escapeHtml(status)}</strong></div>`).join('');
};

const renderFooter=()=>{document.getElementById('pageFooter').innerHTML=`Data source: <strong>ClickUp Field</strong> · Scorecards list: <strong>Scorecards</strong> · Refreshed ${escapeHtml(formatRefresh(clickUpSnapshot.refreshedAt))}. Financial fields remain intentionally blank until their ClickUp custom fields are mapped.`};

const init=()=>{renderKpis();renderSummary();renderVendorCards();renderInvoices();renderQuality();renderRevenue();renderQueue();renderCoverage();renderFooter();};
document.addEventListener('DOMContentLoaded',init);
