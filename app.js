const clickUpSnapshot = {
  source: 'ClickUp',
  space: 'Field',
  refreshedAt: '2026-08-12T12:05:00-05:00'
};

const tasks = [
  ['Family Dollar (Pilot)', 'vendor po to issue', 'New White Glove Installations'],
  ['Rexall Multi Store Pilot', 'prospective project', 'Installations Main Tracker'],
  ['iShoppes JFK', 'prospective project', 'Installations Main Tracker'],
  ['US L.B.M : Higginbotham Brothers - BIG SPRINGS TX', 'not reported', 'Installations Main Tracker'],
  ['OxxO 2nd Visit Quality (10MON)', 'not reported', 'Installations Main Tracker'],
  ['Rexall', 'prospective project', 'Installations Main Tracker'],
  ['Reeves Ace Hardware - Highlands', 'not reported', 'Installations Main Tracker'],
  ['Food 4 Less', 'not reported', 'Installations Main Tracker'],
  ['Dollar General', 'not reported', 'Installations Main Tracker'],
  ['Tractor Supply Pilot', 'not reported', 'Installations Main Tracker'],
  ['PETCO Mexico', 'not reported', 'Installations Main Tracker'],
  ['Homes Alive Pets West Edmonton', 'not reported', 'Installations Main Tracker'],
  ['Homes Alive Pets - Red Deer', 'not reported', 'Installations Main Tracker'],
  ['WMUS TopStock Gen 1 Unistall', 'not reported', 'Installations Main Tracker'],
  ['Family Dollar', 'not reported', 'Installations Main Tracker'],
  ['DHI', 'not reported', 'Installations Main Tracker'],
  ['Dark store install', 'not reported', 'Installations Main Tracker'],
  ['Homes Alive Pets Sherwood', 'not reported', 'Installations Main Tracker'],
  ['Miniso', 'not reported', 'Installations Main Tracker'],
  ['WMUS Top Stock Gen 2', 'not reported', 'Installations Main Tracker'],
  ['SASR', 'not reported', 'Installations Main Tracker'],
  ['Import all Invoice/Cost into Clickup', 'not reported', 'Installations Main Tracker'],
  ['Hucks # 264', 'not reported', 'Installations Main Tracker'],
  ['The Fresh Market', 'prospective project', 'Installations Main Tracker']
];

const vendorKeywords = [
  'SASR', 'Rexall', 'Food 4 Less', 'Family Dollar', 'Dollar General',
  'Tractor Supply', 'Homes Alive', 'Miniso', 'PETCO', 'OxxO'
];

const vendorRows = vendorKeywords.map((vendor) => ({
  vendor,
  matches: tasks.filter(([name]) => name.toLowerCase().includes(vendor.toLowerCase()))
}));

const stageCounts = tasks.reduce((counts, [, status]) => {
  counts[status] = (counts[status] || 0) + 1;
  return counts;
}, {});

const reportedCount = tasks.filter(([, status]) => status !== 'not reported').length;
const prospectiveCount = tasks.filter(([, status]) => status === 'prospective project').length;
const matchedVendorCount = vendorRows.filter(({ matches }) => matches.length > 0).length;
const unmappedCount = tasks.length;

const kpis = [
  ['ClickUp tasks', tasks.length, 'Field workspace snapshot', '▣', 'up'],
  ['Prospective projects', prospectiveCount, 'Current task status', '◉', 'up'],
  ['Vendor workstreams', matchedVendorCount, 'Matched by task name', '◈', 'up'],
  ['Status reported', `${reportedCount}/${tasks.length}`, 'Tasks with an actionable status', '◷', 'up'],
  ['Quality score', 'N/A', 'Custom field not mapped', 'Q', 'warn'],
  ['Installation margin', 'N/A', 'Custom field not mapped', '%', 'warn'],
  ['On-time rate', 'N/A', 'Custom field not mapped', 'T', 'warn'],
  ['Invoice aging', 'N/A', 'Custom field not mapped', '$', 'warn']
];

const safe = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

const formatRefresh = (iso) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago'
}).format(new Date(iso));

const statusClass = (status) => {
  if (status === 'prospective project') return 'green';
  if (status === 'vendor po to issue') return 'watch';
  if (status === 'not reported') return 'risk';
  return 'stage';
};

const renderKpis = () => {
  document.getElementById('kpiGrid').innerHTML = kpis.map(([label, value, detail, icon, state]) => `
    <article class="kpi">
      <div class="label"><span class="dot">${icon}</span>${safe(label)}</div>
      <div class="value">${safe(value)}</div>
      <div class="delta ${state === 'warn' ? 'down' : ''}">${safe(detail)}</div>
    </article>
  `).join('');
};

const renderSummary = () => {
  const refreshed = formatRefresh(clickUpSnapshot.refreshedAt);
  document.getElementById('summaryList').innerHTML = `
    <div class="summary-item"><div class="summary-icon">▣</div><div><div class="summary-label">Workspace</div><div class="summary-value">${safe(clickUpSnapshot.space)}</div><div class="trend">Operational source</div></div></div>
    <div class="summary-item"><div class="summary-icon">◉</div><div><div class="summary-label">Tasks loaded</div><div class="summary-value">${tasks.length}</div><div class="trend">Current snapshot</div></div></div>
    <div class="summary-item"><div class="summary-icon">◷</div><div><div class="summary-label">Last refresh</div><div class="summary-value">${safe(refreshed)}</div><div class="trend">Central time</div></div></div>
  `;
};

const renderVendorTable = () => {
  document.getElementById('vendorTable').innerHTML = vendorRows.map(({ vendor, matches }) => `
    <tr>
      <td>${safe(vendor)}</td>
      <td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
      <td><span class="status ${matches.length ? 'green' : 'risk'}">${matches.length} task${matches.length === 1 ? '' : 's'}</span></td>
    </tr>
  `).join('');
};

const renderProjects = () => {
  document.getElementById('projectTable').innerHTML = tasks.map(([name, status]) => `
    <tr>
      <td>${safe(name)}</td>
      <td>Not mapped</td>
      <td>Not mapped</td>
      <td><span class="status ${statusClass(status)}">${safe(status)}</span></td>
      <td>—</td><td>—</td><td>—</td>
    </tr>
  `).join('');
};

const renderAging = () => {
  const buckets = ['Current', '1–30 Days', '31–60 Days', '61–90 Days', '90+ Days'];
  document.getElementById('agingGrid').innerHTML = buckets.map((bucket) => `
    <div class="aging-card"><div class="age">${bucket}</div><div class="amt">N/A</div><div class="pct">Field not mapped</div></div>
  `).join('');

  document.getElementById('invoiceTable').innerHTML = `
    <tr><td>Invoice / cost workstream</td><td>—</td><td>—</td><td><span class="status watch">Mapping needed</span></td></tr>
  `;
};

const makeCharts = () => {
  if (!window.Chart) return;

  Chart.defaults.color = '#94a6b9';
  Chart.defaults.borderColor = '#1a3045';
  Chart.defaults.font.family = 'Inter';
  Chart.defaults.font.size = 9;

  const statusLabels = Object.keys(stageCounts);
  const statusValues = Object.values(stageCounts);

  new Chart(document.getElementById('qualityChart'), {
    type: 'bar',
    data: {
      labels: statusLabels,
      datasets: [{
        label: 'Tasks',
        data: statusValues,
        backgroundColor: ['#2f86ff', '#57d98a', '#f3c85b'],
        borderRadius: 6,
        maxBarThickness: 48
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { displayColors: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#102435' } },
        x: { grid: { display: false } }
      }
    }
  });

  new Chart(document.getElementById('costChart'), {
    type: 'doughnut',
    data: {
      labels: ['Prospective project', 'Vendor PO to issue', 'Not reported'],
      datasets: [{
        data: [stageCounts['prospective project'] || 0, stageCounts['vendor po to issue'] || 0, stageCounts['not reported'] || 0],
        backgroundColor: ['#57d98a', '#f3c85b', '#2f86ff'],
        borderColor: '#071522',
        borderWidth: 4,
        hoverOffset: 5
      }]
    },
    options: {
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 9, padding: 14 } },
        tooltip: { displayColors: false }
      }
    }
  });

  const topTasks = tasks.slice(0, 10);
  new Chart(document.getElementById('marginChart'), {
    type: 'bar',
    data: {
      labels: topTasks.map(([name]) => name.length > 18 ? `${name.slice(0, 18)}…` : name),
      datasets: [{
        label: 'Reported status',
        data: topTasks.map(([, status]) => status === 'not reported' ? 0 : 1),
        backgroundColor: '#35d5ff',
        borderRadius: 5,
        maxBarThickness: 22
      }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { displayColors: false } },
      scales: {
        x: { beginAtZero: true, max: 1, ticks: { stepSize: 1, callback: (value) => value ? 'Reported' : 'Not reported' }, grid: { color: '#102435' } },
        y: { grid: { display: false } }
      }
    }
  });
};

const renderFooter = () => {
  document.querySelector('.page-footer').innerHTML = `
    Data source: <strong>ClickUp</strong> · Refreshed ${safe(formatRefresh(clickUpSnapshot.refreshedAt))}. 
    ${unmappedCount} task records loaded. Financial, quality, safety, margin, and invoice-aging metrics remain unavailable until ClickUp custom fields are mapped.
  `;
};

const init = () => {
  renderKpis();
  renderSummary();
  renderVendorTable();
  renderProjects();
  renderAging();
  renderFooter();
  makeCharts();
};

document.addEventListener('DOMContentLoaded', init);
