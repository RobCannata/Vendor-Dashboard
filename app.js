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

function renderExecutiveSummary(scores, projectScores, monthKey) {
  const vendorRows = vendors
    .map(name => ({ name, score: Number(scores?.[name]) }))
    .filter(item => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score);

  const avg = vendorRows.length ? Math.round(vendorRows.reduce((sum, row) => sum + row.score, 0) / vendorRows.length) : null;
  const overall = document.getElementById('summaryOverall');
  const overallDetail = document.getElementById('summaryOverallDetail');
  if (overall) {
    overall.textContent = avg == null ? 'No score' : avg >= 90 ? 'Strong' : avg >= 80 ? 'Watch' : 'At risk';
    overall.className = `summary-status ${scoreBand(avg)}`;
  }
  if (overallDetail) overallDetail.textContent = avg == null ? 'Waiting for ClickUp score feed.' : `${vendorRows.length} of ${vendors.length} vendor scorecards reporting; average ${avg}%.`;

  const wins = vendorRows.slice(0, 3).map(row => `<div><strong>${row.name}</strong><span>${row.score}%</span></div>`).join('') || '<div>No current vendor scores.</div>';
  const misses = [...vendorRows].sort((a, b) => a.score - b.score).slice(0, 3).map(row => `<div><strong>${row.name}</strong><span>${row.score}%</span></div>`).join('') || '<div>No current vendor scores.</div>';

  const projectRows = Object.entries(projectScores || {})
    .map(([name, score]) => ({ name, score: Number(score) }))
    .filter(item => Number.isFinite(item.score))
    .sort((a, b) => a.score - b.score);
  const risks = projectRows.filter(row => row.score < 80).slice(0, 3);
  const riskHtml = risks.map(row => `<div><strong>${row.name}</strong><span>${row.score}%</span></div>`).join('') || '<div>No project scores below 80%.</div>';
  const decisions = risks.length
    ? risks.map(row => `<div>Review <strong>${row.name}</strong> and confirm recovery action.</div>`).join('')
    : '<div>No score-driven decision required from the current data.</div>';

  const setHtml = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };
  setHtml('summaryWins', wins);
  setHtml('summaryMisses', misses);
  setHtml('summaryRisks', riskHtml);
  setHtml('summaryDecisions', decisions);

  const period = document.getElementById('summaryPeriodLabel');
  if (period) period.textContent = new Date(`${monthKey}-01T00:00:00`).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function setupMonths(payload) {
  const primary = document.getElementById('reportMonth');
  const summary = document.getElementById('reportMonthSummary');
  const selects = [primary, summary].filter(Boolean);
  if (!selects.length) return;
  const available = new Set(Object.keys(payload?.invoiceMonthly || {}));
  const currentMonth = new Date().getMonth() + 1;

  selects.forEach(select => {
    select.innerHTML = '';
    for (let month = 1; month <= 12; month += 1) {
      const key = `${REPORT_YEAR}-${String(month).padStart(2, '0')}`;
      const option = document.createElement('option');
      option.value = key;
      option.textContent = new Date(REPORT_YEAR, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (available.has(key)) option.textContent += ' • data';
      if (month === currentMonth) option.selected = true;
      select.appendChild(option);
    }
  });

  if (primary) primary.value = primary.value || `${REPORT_YEAR}-01`;
  if (summary) summary.value = primary?.value || `${REPORT_YEAR}-01`;

  selects.forEach(select => {
    select.onchange = () => {
      selects.forEach(other => { if (other !== select) other.value = select.value; });
      renderInvoiceMonth(payload, select.value);
      renderExecutiveSummary(payload?.scores || {}, payload?.projectScores || {}, select.value);
    };
  });
}

function renderInvoiceMonth(payload, monthKey) {
  const invoices = (payload?.invoices || []).filter(invoice => invoice.month === monthKey);
  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const label = new Date(`${monthKey}-01T00:00:00`).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const topTotal = document.getElementById('invoiceMonthTotal');
  if (topTotal) topTotal.textContent = money(total);
  const topDetail = document.getElementById('invoiceMonthDetail');
  if (topDetail) topDetail.textContent = `${invoices.length} invoice record${invoices.length === 1 ? '' : 's'} in ClickUp`;

  const selectedMonth = document.getElementById('invoiceSelectedMonth');
  const panelTotal = document.getElementById('invoicePanelTotal');
  const count = document.getElementById('invoiceCount');
  const rows = document.getElementById('invoiceRows');
  if (selectedMonth) selectedMonth.textContent = label;
  if (panelTotal) panelTotal.textContent = money(total);
  if (count) count.textContent = String(invoices.length);
  if (!rows) return;

  if (!invoices.length) {
    rows.innerHTML = '<tr><td colspan="3" class="invoice-empty">No Vendor Invoice amount found for this month.</td></tr>';
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
    const selectedMonth = document.getElementById('reportMonth')?.value || `${REPORT_YEAR}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    renderInvoiceMonth(payload, selectedMonth);
    renderExecutiveSummary(scores, projectScores, selectedMonth);

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

document.addEventListener('DOMContentLoaded', loadClickUpScores);
