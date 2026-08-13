const FINANCE_YEAR = 2026;

function periodKeys(periodValue) {
  const [countRaw, endRaw] = String(periodValue || '1|1').split('|');
  const count = Number(countRaw) || 1;
  const endMonth = Number(endRaw) || 1;
  const startMonth = Math.max(1, endMonth - count + 1);
  const keys = [];
  for (let month = startMonth; month <= endMonth; month += 1) {
    keys.push(`${FINANCE_YEAR}-${String(month).padStart(2, '0')}`);
  }
  return keys;
}

function periodLabel(periodValue) {
  const [countRaw, endRaw] = String(periodValue || '1|1').split('|');
  const count = Number(countRaw) || 1;
  const endMonth = Number(endRaw) || 1;
  const startMonth = Math.max(1, endMonth - count + 1);
  const end = new Date(FINANCE_YEAR, endMonth - 1, 1);
  const start = new Date(FINANCE_YEAR, startMonth - 1, 1);
  const endLabel = end.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  if (count === 1) return endLabel;
  return `${start.toLocaleString('en-US', { month: 'short' })}–${endLabel}`;
}

function money(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
}

function setupSectionIdsAndNav() {
  const summary = document.querySelector('.summary-panel');
  const vendorGrid = document.querySelector('.vendor-grid');
  const controlGrid = document.querySelector('.control-grid');
  const queuePanel = document.querySelector('.queue-panel');
  if (summary) summary.id = 'executive-summary';
  if (vendorGrid) vendorGrid.id = 'vendor-scorecards';
  if (controlGrid) controlGrid.id = 'financial-execution';
  if (queuePanel) queuePanel.id = 'work-queue';

  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || sidebar.querySelector('.side-nav')) return;

  const nav = document.createElement('nav');
  nav.className = 'side-nav';
  nav.setAttribute('aria-label', 'Dashboard sections');
  nav.innerHTML = `
    <div class="side-title">Navigate</div>
    <a href="#executive-summary">Executive Summary</a>
    <a href="#vendor-scorecards">Vendor Scorecards</a>
    <a href="#financial-execution">Financial &amp; Execution</a>
    <a href="#work-queue">Installation Work Queue</a>
  `;
  const brand = sidebar.querySelector('.brand');
  brand?.after(nav);
}

function getPeriodSelection() {
  return document.getElementById('reportMonthSummary')?.value || '1|1';
}

function renderRevenue(payload, periodValue) {
  const keys = periodKeys(periodValue);
  const rows = (payload?.customerInvoices || []).filter(item => keys.includes(item.month));
  const revenue = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const vendorCost = rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.vendorCost)) ? Number(row.vendorCost) : 0), 0);
  const marginRows = rows.filter(row => Number.isFinite(Number(row.grossMargin)));
  const margin = marginRows.reduce((sum, row) => sum + Number(row.grossMargin), 0);
  const marginPct = revenue > 0 && marginRows.length ? (margin / revenue) * 100 : null;
  const label = periodLabel(periodValue);

  const summaryKpi = document.querySelector('.summary-kpi-grid .kpi:nth-child(3)');
  if (summaryKpi) {
    const value = summaryKpi.querySelector('.value');
    const detail = summaryKpi.querySelector('.detail');
    if (value) value.textContent = money(revenue);
    if (detail) detail.textContent = `${rows.length} Customer Invoice record${rows.length === 1 ? '' : 's'} • ${label}`;
    detail?.classList.remove('warn');
  }

  const panel = document.querySelector('.revenue-panel');
  if (panel) {
    const value = panel.querySelector('.revenue-value');
    const caption = panel.querySelector('.revenue-caption');
    const metrics = panel.querySelectorAll('.metric-row strong');
    if (value) value.textContent = money(revenue);
    if (caption) caption.textContent = `${rows.length} Customer Invoice record${rows.length === 1 ? '' : 's'} for ${label}.`;
    if (metrics[0]) metrics[0].textContent = 'Customer Invoice';
    if (metrics[1]) metrics[1].textContent = money(vendorCost);
    if (metrics[2]) metrics[2].textContent = marginRows.length ? `${money(margin)} (${marginPct.toFixed(1)}%)` : '—';
  }

  let marginLabel = document.querySelector('.revenue-panel .margin-live-label');
  if (!marginLabel && panel) {
    marginLabel = document.createElement('div');
    marginLabel.className = 'margin-live-label';
    marginLabel.innerHTML = `<span>Gross margin</span><strong></strong>`;
    panel.querySelector('.panel-head')?.after(marginLabel);
  }
  if (marginLabel) {
    const strong = marginLabel.querySelector('strong');
    if (strong) strong.textContent = marginRows.length ? `${money(margin)} (${marginPct.toFixed(1)}%)` : 'No matched Vendor Invoice records';
  }
}

async function loadRevenue() {
  try {
    const response = await fetch(`clickup-scores.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    renderRevenue(payload, getPeriodSelection());

    const select = document.getElementById('reportMonthSummary');
    select?.addEventListener('change', () => renderRevenue(payload, getPeriodSelection()));
  } catch (error) {
    console.error('Unable to load Customer Invoice revenue:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupSectionIdsAndNav();
  loadRevenue();
});
