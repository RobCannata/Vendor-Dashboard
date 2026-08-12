const vendors = [
  {
    name: 'SASR',
    score: 100,
    records: 3,
    status: 'Green',
    source: 'Calculated score available',
    projects: [
      { name: 'DHI', score: null, records: 1, status: 'Pending' },
      { name: 'Dollar General Pilot', score: null, records: 1, status: 'Pending' }
    ]
  },
  {
    name: 'Anderson',
    score: null,
    records: 7,
    status: 'Pending',
    source: 'Scorecard records available',
    projects: [
      { name: 'Natural Grocers', score: null, records: 1, status: 'Pending' },
      { name: 'Hucks Stores Pilot', score: null, records: 1, status: 'Pending' },
      { name: 'WMUS Top Stock', score: null, records: 1, status: 'Pending' },
      { name: 'WMUS Audits', score: null, records: 1, status: 'Pending' },
      { name: 'Academy Sports', score: null, records: 1, status: 'Pending' }
    ]
  },
  {
    name: 'Channel Partners',
    score: null,
    records: 4,
    status: 'Pending',
    source: 'Scorecard records available',
    projects: [
      { name: 'Miniso', score: null, records: 1, status: 'Pending' },
      { name: 'Ace Elgin', score: null, records: 1, status: 'Pending' },
      { name: 'Dufry', score: null, records: 1, status: 'Pending' }
    ]
  },
  {
    name: 'Impulso',
    score: null,
    records: 2,
    status: 'Pending',
    source: 'Scorecard records available',
    projects: [
      { name: 'Oxxo Revisits', score: null, records: 1, status: 'Pending' }
    ]
  },
  {
    name: 'B2X',
    score: null,
    records: 1,
    status: 'Pending',
    source: 'Scorecard record available',
    projects: [
      { name: 'Food 4 Less', score: null, records: 1, status: 'Pending' }
    ]
  }
];

const invoiceStages = [
  { label: 'Pending vendor invoice', count: 0 },
  { label: 'Ready for OTB reception', count: 0 },
  { label: 'Complete', count: 0 }
];

const workQueue = [
  ['Family Dollar (Pilot)', 'New White Glove Installations', 'Vendor PO to issue', 'Vendor PO / scheduling'],
  ['Rexall Multi Store Pilot', 'Installations Main Tracker', 'Prospective project', 'Planning'],
  ['iShoppes JFK', 'Installations Main Tracker', 'Prospective project', 'Planning'],
  ['The Fresh Market', 'Installations Main Tracker', 'Prospective project', 'Planning'],
  ['Import all Invoice/Cost into Clickup', 'Objectives', 'Installation to request', 'Financial data workstream'],
  ['OxxO 2nd Visit Quality (10MON)', 'Installations Main Tracker', 'Not reported', 'Quality / status review'],
  ['WMUS Top Stock Gen 2', 'Installations Main Tracker', 'Not reported', 'Status review'],
  ['SASR', 'Installations Main Tracker', 'Not reported', 'Operational follow-up']
];

const refresh = 'Aug 12, 2026 • 12:05 PM CT';
const scoredVendors = vendors.filter(v => v.score !== null);
const avgQuality = scoredVendors.length
  ? Math.round(scoredVendors.reduce((sum, v) => sum + v.score, 0) / scoredVendors.length)
  : null;
const projectCount = vendors.reduce((sum, vendor) => sum + vendor.projects.length, 0);

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));

function renderKpis() {
  const data = [
    ['Installation Quality Score', avgQuality === null ? '—' : avgQuality + '%', `${scoredVendors.length} of ${vendors.length} vendors scored`, 'Q', 'good'],
    ['Vendor Performance Scorecards', vendors.length, `${projectCount} related projects`, 'V', 'good'],
    ['Service Revenue', '—', 'Financial field mapping required', '$', 'warn'],
    ['Vendor Invoices', '—', 'Invoice amount/status mapping required', '$', 'warn']
  ];
  document.getElementById('topKpis').innerHTML = data.map(([label, value, detail, icon, state]) => `
    <article class="kpi">
      <div class="kpi-label"><span class="icon">${icon}</span>${esc(label)}</div>
      <div class="value">${esc(value)}</div>
      <div class="detail ${state === 'warn' ? 'warn' : ''}">${esc(detail)}</div>
    </article>`).join('');
}

function renderSource() {
  document.getElementById('sourceSummary').innerHTML = `
    <div class="side-row"><span>Workspace</span><strong>Field</strong></div>
    <div class="side-row"><span>List</span><strong>Scorecards</strong></div>
    <div class="side-row"><span>Vendors</span><strong>${vendors.length}</strong></div>
    <div class="side-row"><span>Projects</span><strong>${projectCount}</strong></div>
    <div class="side-row"><span>Refresh</span><strong>${refresh}</strong></div>`;
}

function renderVendors() {
  document.getElementById('vendorGrid').innerHTML = vendors.map(v => `
    <article class="vendor-card">
      <div class="vendor-top">
        <div>
          <div class="vendor-name">${esc(v.name)}</div>
          <div class="vendor-meta">${v.records} linked scorecard record${v.records === 1 ? '' : 's'}</div>
        </div>
        <span class="badge ${v.score !== null ? 'good' : 'pending'}">${v.status.toUpperCase()}</span>
      </div>

      <div class="score-box">
        <div class="score-label"><span>Vendor quality</span><span>${v.score !== null ? 'Calculated' : 'Awaiting data'}</span></div>
        <div class="score ${v.score === null ? 'na' : ''}">${v.score === null ? '—' : v.score + '%'}</div>
        <div class="bar"><span style="width:${v.score || 0}%"></span></div>
      </div>

      <div class="vendor-foot"><span>${esc(v.source)}</span></div>

      <div class="project-stack">
        <div class="project-stack-title">Projects <strong>${v.projects.length}</strong></div>
        ${v.projects.map(p => `
          <div class="project-row">
            <div class="project-info">
              <span class="project-name">${esc(p.name)}</span>
              <span class="project-meta">${p.records} scorecard record</span>
            </div>
            <div class="project-result">
              <strong>${p.score === null ? '—' : p.score + '%'}</strong>
              <span class="project-status">${esc(p.status)}</span>
            </div>
          </div>`).join('')}
      </div>
    </article>`).join('');
}

function renderQuality() {
  document.getElementById('qualityPanel').innerHTML = `
    <div class="quality-top">
      <div><div class="quality-average">${avgQuality === null ? '—' : avgQuality + '%'}</div><div class="eyebrow">AVERAGE AVAILABLE SCORE</div></div>
      <div class="quality-note">Numeric scores are only shown when a calculated ClickUp score is available.</div>
    </div>
    ${vendors.map(v => `<div class="quality-row"><div><div class="qname">${esc(v.name)}</div><div class="qtrack"><span style="width:${v.score || 0}%"></span></div></div><div class="qscore">${v.score === null ? '—' : v.score + '%'}</div></div>`).join('')}`;
}

function renderInvoices() {
  document.getElementById('invoicePanel').innerHTML = `
    <div class="invoice-stats">
      <div class="invoice-stat"><span>Total invoice value</span><strong>—</strong></div>
      <div class="invoice-stat"><span>Pending invoices</span><strong>${invoiceStages[0].count}</strong></div>
      <div class="invoice-stat"><span>Vendors tracked</span><strong>${vendors.length}</strong></div>
    </div>
    <table class="invoice-table"><thead><tr><th>Workflow</th><th>Count</th><th>Amount</th></tr></thead><tbody>
      ${invoiceStages.map(x => `<tr><td>${esc(x.label)}</td><td>${x.count}</td><td>—</td></tr>`).join('')}
    </tbody></table>`;
}

function renderQueue() {
  document.getElementById('workQueue').innerHTML = workQueue.map(([name, list, status, action]) => {
    const cls = status === 'Prospective project' ? 'status-green' : status === 'Vendor PO to issue' ? 'status-amber' : 'status-red';
    return `<tr><td>${esc(name)}</td><td>${esc(list)}</td><td><span class="status ${cls}">${esc(status)}</span></td><td>${esc(action)}</td></tr>`;
  }).join('');
}

function init() {
  renderKpis();
  renderSource();
  renderVendors();
  renderQuality();
  renderInvoices();
  renderQueue();
  document.getElementById('footer').innerHTML = `Source: <strong>ClickUp Field / Scorecards</strong> • Refreshed ${refresh}. Projects are nested under their assigned vendor so ownership is visible in one card.`;
}

document.addEventListener('DOMContentLoaded', init);
