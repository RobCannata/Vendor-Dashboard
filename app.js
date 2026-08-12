const vendors = ['SASR', 'Anderson', 'Channel Partners', 'Impulso', 'B2X'];
const REPORT_YEAR = 2026;

const clickUpLinks = {
  vendors: {
    'SASR': 'https://app.clickup.com/t/869ed6zn3',
    'Anderson': 'https://app.clickup.com/t/869dmepg4',
    'Channel Partners': 'https://app.clickup.com/t/869d1ete9',
    'Impulso': 'https://app.clickup.com/t/869duw9kp',
    'B2X': 'https://app.clickup.com/t/869egpcgz'
  },
  projects: {
    'DHI': 'https://app.clickup.com/t/869ed6zzt',
    'Dollar General Pilot': 'https://app.clickup.com/t/869ed6zxk',
    'Natural Grocers': 'https://app.clickup.com/t/869ed78hy',
    'Hucks Stores Pilot': 'https://app.clickup.com/t/869daqvck',
    'WMUS Top Stock': 'https://app.clickup.com/t/869dvfp4w',
    'WMUS Audits': 'https://app.clickup.com/t/869dvfnue',
    'Academy Sports': 'https://app.clickup.com/t/869d1wf7v',
    'Miniso': 'https://app.clickup.com/t/869ed7at4',
    'Ace Elgin': 'https://app.clickup.com/t/869d4m6vq',
    'Dufry': 'https://app.clickup.com/t/869dmfb7c',
    'Oxxo Revisits': 'https://app.clickup.com/t/869duwa8r',
    'Food 4 Less': 'https://app.clickup.com/t/869egpcpd'
  }
};

function loadSummaryStyles() {
  if (document.querySelector('link[data-summary-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `summary.css?v=${Date.now()}`;
  link.dataset.summaryStyles = 'true';
  document.head.appendChild(link);
}

function scoreBand(score) {
  if (!Number.isFinite(score)) return 'na';
  if (score >= 90) return 'score-green';
  if (score >= 80) return 'score-blue';
  if (score >= 70) return 'score-orange';
  return 'score-red';
}

function fmtScore(value) {
  return Number.isFinite(value) ? `${value}%` : '—';
}

function money(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
}

function applyScore(card, score) {
  const value = card.querySelector('.score');
  const bar = card.querySelector('.bar span');
  const label = card.querySelector('.score-source');
  const badge = card.querySelector('.badge');
  if (!value || !bar) return;

  value.textContent = fmtScore(score);
  value.classList.toggle('na', !Number.isFinite(score));
  value.classList.remove('score-green', 'score-blue', 'score-orange', 'score-red');
  value.classList.add(scoreBand(score));
  bar.style.width = Number.isFinite(score) ? `${score}%` : '0%';
  bar.className = scoreBand(score);

  if (Number.isFinite(score)) {
    badge.textContent = score >= 90 ? 'STRONG' : score >= 80 ? 'WATCH' : 'AT RISK';
    badge.className = `badge ${score >= 90 ? 'good' : score >= 80 ? 'pending' : 'risk'}`;
    if (label) label.textContent = 'Live ClickUp score';
  }
}

function applyProjectScores(projectScores) {
  const rows = [...document.querySelectorAll('.project-row')];
  rows.forEach(row => {
    const name = row.querySelector('.project-name')?.textContent?.trim();
    const result = row.querySelector('.project-result');
    const scoreEl = row.querySelector('.project-result strong');
    if (!name || !result || !scoreEl) return;

    const score = Number(projectScores?.[name]);
    scoreEl.classList.remove('project-score-live', 'score-green', 'score-blue', 'score-orange', 'score-red');
    result.querySelector('.project-score-bar')?.remove();

    if (Number.isFinite(score)) {
      scoreEl.textContent = `${score}%`;
      const band = scoreBand(score);
      scoreEl.classList.add('project-score-live', band);

      const track = document.createElement('div');
      track.className = 'project-score-bar';
      track.innerHTML = `<span class="${band}" style="width:${score}%"></span>`;
      result.appendChild(track);

      const status = result.querySelector('.project-status');
      if (status) {
        status.textContent = score >= 90 ? 'Strong' : score >= 80 ? 'Watch' : 'At risk';
        status.className = `project-status ${band}`;
      }
    } else {
      scoreEl.textContent = '—';
      const status = result.querySelector('.project-status');
      if (status) {
        status.textContent = 'Pending';
        status.className = 'project-status';
      }
    }
  });
}

function setupClickUpLinks() {
  document.querySelectorAll('.vendor-card').forEach(card => {
    const vendor = card.querySelector('.vendor-name')?.textContent?.trim();
    const vendorUrl = clickUpLinks.vendors[vendor];
    if (!vendorUrl) return;

    card.classList.add('clickup-linked');
    card.setAttribute('title', `Open ${vendor} scorecard in ClickUp`);
    card.addEventListener('click', event => {
      const projectRow = event.target.closest('.project-row');
      if (projectRow) return;
      window.open(vendorUrl, '_blank', 'noopener,noreferrer');
    });

    card.querySelectorAll('.project-row').forEach(row => {
      const project = row.querySelector('.project-name')?.textContent?.trim();
      const projectUrl = clickUpLinks.projects[project];
      if (!projectUrl) return;
      row.classList.add('clickup-linked');
      row.setAttribute('title', `Open ${project} scorecard in ClickUp`);
      row.addEventListener('click', event => {
        event.stopPropagation();
        window.open(projectUrl, '_blank', 'noopener,noreferrer');
      });
    });
  });
}

function renderExecutiveSummary() {
  const wins = ['SASR|96%', 'Channel Partners|92%', 'Anderson|81%']
    .map(item => { const [name, score] = item.split('|'); return `<div><strong>${name}</strong><span>${score}</span></div>`; }).join('');
  const misses = ['Impulso|76%', 'Anderson|81%', 'Channel Partners|92%']
    .map(item => { const [name, score] = item.split('|'); return `<div><strong>${name}</strong><span>${score}</span></div>`; }).join('');
  const risks = ['Natural Grocers|68%', 'Ace Elgin|76%', 'Oxxo Revisits|76%']
    .map(item => { const [name, score] = item.split('|'); return `<div><strong>${name}</strong><span>${score}</span></div>`; }).join('');
  const decisions = '<div>Review <strong>Natural Grocers</strong> and confirm recovery action.</div><div>Review <strong>Ace Elgin</strong> and confirm recovery action.</div>';

  const setHtml = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };
  setHtml('summaryWins', wins);
  setHtml('summaryMisses', misses);
  setHtml('summaryRisks', risks);
  setHtml('summaryDecisions', decisions);
}

function periodMonths(endMonth, monthsBack) {
  const endIndex = endMonth - 1;
  const startIndex = Math.max(0, endIndex - monthsBack + 1);
  const keys = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    keys.push(`${REPORT_YEAR}-${String(index + 1).padStart(2, '0')}`);
  }
  return keys;
}

function formatPeriodLabel(endMonth, monthsBack) {
  const end = new Date(REPORT_YEAR, endMonth - 1, 1);
  const startMonth = Math.max(1, endMonth - monthsBack + 1);
  const start = new Date(REPORT_YEAR, startMonth - 1, 1);
  const endLabel = end.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  if (monthsBack === 1) return endLabel;
  const startLabel = start.toLocaleString('en-US', { month: 'short' });
  return `${startLabel}–${endLabel}`;
}

function setupMonths(payload) {
  const selects = [document.getElementById('reportMonth'), document.getElementById('reportMonthSummary')].filter(Boolean);
  if (!selects.length) return;

  const available = new Set(Object.keys(payload?.invoiceMonthly || {}));
  const currentMonth = new Date().getMonth() + 1;
  const options = [];

  const monthlyGroup = document.createElement('optgroup');
  monthlyGroup.label = 'Monthly';
  for (let month = 1; month <= 12; month += 1) {
    const option = document.createElement('option');
    option.value = `1|${month}`;
    option.textContent = new Date(REPORT_YEAR, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }) + (available.has(`${REPORT_YEAR}-${String(month).padStart(2, '0')}`) ? ' • data' : '');
    monthlyGroup.appendChild(option);
  }
  options.push(monthlyGroup);

  const rolling3 = document.createElement('optgroup');
  rolling3.label = 'Rolling 3 Months';
  for (let month = 1; month <= 12; month += 1) {
    const option = document.createElement('option');
    option.value = `3|${month}`;
    option.textContent = `${formatPeriodLabel(month, 3)} — 3 Month View`;
    rolling3.appendChild(option);
  }
  options.push(rolling3);

  const rolling6 = document.createElement('optgroup');
  rolling6.label = 'Rolling 6 Months';
  for (let month = 1; month <= 12; month += 1) {
    const option = document.createElement('option');
    option.value = `6|${month}`;
    option.textContent = `${formatPeriodLabel(month, 6)} — 6 Month View`;
    rolling6.appendChild(option);
  }
  options.push(rolling6);

  selects.forEach(select => {
    select.innerHTML = '';
    options.forEach(group => select.appendChild(group.cloneNode(true)));
    select.value = `1|${currentMonth}`;
  });

  selects.forEach(select => {
    select.onchange = () => {
      selects.forEach(other => { if (other !== select) other.value = select.value; });
      renderInvoicePeriod(payload, select.value);
      renderExecutiveSummary();
    };
  });
}

function renderInvoicePeriod(payload, periodKey) {
  const [monthsBackRaw, endMonthRaw] = String(periodKey || '1|1').split('|');
  const monthsBack = Number(monthsBackRaw) || 1;
  const endMonth = Number(endMonthRaw) || 1;
  const monthKeys = periodMonths(endMonth, monthsBack);
  const invoices = (payload?.invoices || []).filter(invoice => monthKeys.includes(invoice.month));
  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const label = formatPeriodLabel(endMonth, monthsBack);

  const topTotal = document.getElementById('invoiceMonthTotal');
  if (topTotal) topTotal.textContent = money(total);
  const topDetail = document.getElementById('invoiceMonthDetail');
  if (topDetail) topDetail.textContent = `${invoices.length} invoice record${invoices.length === 1 ? '' : 's'} across ${monthsBack} month${monthsBack === 1 ? '' : 's'}`;

  const selectedMonth = document.getElementById('invoiceSelectedMonth');
  const panelTotal = document.getElementById('invoicePanelTotal');
  const count = document.getElementById('invoiceCount');
  const rows = document.getElementById('invoiceRows');
  if (selectedMonth) selectedMonth.textContent = label;
  if (panelTotal) panelTotal.textContent = money(total);
  if (count) count.textContent = String(invoices.length);
  if (!rows) return;

  if (!invoices.length) {
    rows.innerHTML = '<tr><td colspan="3" class="invoice-empty">No Vendor Invoice amount found for this reporting period.</td></tr>';
    return;
  }

  const ordered = [...invoices].sort((a, b) => Number(b.amount) - Number(a.amount));
  rows.innerHTML = ordered.slice(0, 50).map(invoice => {
    const vendor = invoice.vendor || 'Unassigned';
    return `<tr><td>${vendor}</td><td>${money(Number(invoice.amount))}</td><td><a class="invoice-link" href="${invoice.url}" target="_blank" rel="noopener">${invoice.task}</a></td></tr>`;
  }).join('');
}

async function loadClickUpScores() {
  try {
    const res = await fetch(`clickup-scores.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    const scores = payload?.scores || {};
    const projectScores = payload?.projectScores || {};
    const cards = [...document.querySelectorAll('.vendor-card')];

    cards.forEach(card => {
      const name = card.querySelector('.vendor-name')?.textContent?.trim();
      if (!name) return;
      applyScore(card, Number.isFinite(Number(scores[name])) ? Number(scores[name]) : null);
    });

    applyProjectScores(projectScores);
    setupClickUpLinks();
    setupMonths(payload);
    const currentMonth = new Date().getMonth() + 1;
    const selectedPeriod = document.getElementById('reportMonth')?.value || `1|${currentMonth}`;
    renderInvoicePeriod(payload, selectedPeriod);
    renderExecutiveSummary();

    const values = vendors.map(v => Number(scores[v])).filter(Number.isFinite);
    const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    const kpi = document.getElementById('installationQualityScore');
    if (kpi) kpi.textContent = fmtScore(avg);
    const detail = document.getElementById('installationQualityDetail');
    if (detail) detail.textContent = `${values.length} of ${vendors.length} vendors scored from ClickUp`;

    const qualityPanel = document.getElementById('qualityByVendor');
    if (qualityPanel) {
      qualityPanel.innerHTML = vendors.map(v => {
        const score = Number(scores[v]);
        const shown = Number.isFinite(score) ? `${score}%` : '—';
        const width = Number.isFinite(score) ? score : 0;
        const band = scoreBand(score);
        return `<div class="quality-row"><div><div class="qname">${v}</div><div class="qtrack"><span class="${band}" style="width:${width}%"></span></div></div><div class="qscore ${band}">${shown}</div></div>`;
      }).join('');
    }

    const updated = document.getElementById('scoreRefresh');
    if (updated) updated.textContent = payload?.updatedAt ? new Date(payload.updatedAt).toLocaleString() : 'Live ClickUp feed';
  } catch (err) {
    console.error('Unable to load ClickUp score snapshot:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSummaryStyles();
  loadClickUpScores();
});
