const FINANCE_YEAR = 2026;

function periodKeys(periodValue) {
  const [countRaw, endRaw] = String(periodValue || '1|1').split('|');
  const count = Number(countRaw) || 1;
  const endMonth = Number(endRaw) || 1;
  const startMonth = Math.max(1, endMonth - count + 1);
  const keys = [];
  for (let month = startMonth; month <= endMonth; month += 1) keys.push(`${FINANCE_YEAR}-${String(month).padStart(2, '0')}`);
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
  sidebar.querySelector('.brand')?.after(nav);
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

  const value = document.getElementById('serviceRevenueValue');
  const detail = document.getElementById('serviceRevenueDetail');
  if (value) value.textContent = money(revenue);
  if (detail) {
    detail.textContent = `${rows.length} Customer Invoice record${rows.length === 1 ? '' : 's'} • ${label}`;
    detail.classList.remove('warn');
  }

  const panelValue = document.getElementById('serviceRevenuePanel');
  const panelCaption = document.getElementById('serviceRevenueCaption');
  const cost = document.getElementById('serviceVendorCost');
  const gross = document.getElementById('serviceGrossMargin');
  const pct = document.getElementById('serviceMarginPct');
  if (panelValue) panelValue.textContent = money(revenue);
  if (panelCaption) panelCaption.textContent = `${rows.length} Customer Invoice record${rows.length === 1 ? '' : 's'} for ${label}.`;
  if (cost) cost.textContent = money(vendorCost);
  if (gross) gross.textContent = marginRows.length ? money(margin) : '—';
  if (pct) pct.textContent = marginPct != null ? `${marginPct.toFixed(1)}%` : '—';

  const marginLive = document.querySelector('.margin-live-label strong');
  if (marginLive) marginLive.textContent = marginRows.length ? `${money(margin)} (${marginPct.toFixed(1)}%)` : 'No matched Vendor Invoice records';
}

async function loadRevenue() {
  try {
    const response = await fetch(`clickup-scores.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const refresh = () => renderRevenue(payload, getPeriodSelection());
    refresh();
    document.getElementById('reportMonthSummary')?.addEventListener('change', refresh);
    [250, 1000, 2000].forEach(delay => setTimeout(refresh, delay));
  } catch (error) {
    console.error('Unable to load Customer Invoice revenue:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupSectionIdsAndNav();
  loadRevenue();
});
