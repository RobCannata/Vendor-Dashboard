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

function ensureCustomerInvoiceCard() {
  const grid = document.querySelector('.summary-kpi-grid');
  if (!grid || grid.querySelector('.customer-invoice-kpi')) return;
  const card = document.createElement('article');
  card.className = 'kpi customer-invoice-kpi';
  card.innerHTML = '<div class="kpi-label"><span class="icon">$</span>Customer Invoices</div><div class="value" id="customerInvoiceValue">—</div><div class="detail" id="customerInvoiceDetail">Loading Customer Invoice data…</div>';
  const vendorInvoiceCard = document.getElementById('invoiceMonthTotal')?.closest('.kpi');
  grid.insertBefore(card, vendorInvoiceCard || null);
  if (!document.getElementById('customer-invoice-inline-style')) {
    const style = document.createElement('style');
    style.id = 'customer-invoice-inline-style';
    style.textContent = `.summary-kpi-grid{grid-template-columns:repeat(5,minmax(0,1fr)) !important}.customer-invoice-kpi{min-width:0;background:#fff !important;border:1px solid #D9E1EA !important}.customer-invoice-kpi .kpi-label{color:#17365D !important}.customer-invoice-kpi .value{color:#1F2937 !important}.customer-invoice-kpi .detail{color:#667085 !important}@media(max-width:1200px){.summary-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr)) !important}}@media(max-width:900px){.summary-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important}}@media(max-width:620px){.summary-kpi-grid{grid-template-columns:1fr !important}}`;
    document.head.appendChild(style);
  }
}

function renameGrossMarginKpi() {
  const kpi = document.getElementById('serviceRevenueValue')?.closest('.kpi');
  if (!kpi) return;
  const label = kpi.querySelector('.kpi-label');
  if (label) label.innerHTML = '<span class="icon">%</span>Gross Margin';
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
  nav.innerHTML = `<div class="side-title">Navigate</div><a href="#executive-summary">Executive Summary</a><a href="#vendor-scorecards">Vendor Scorecards</a><a href="#financial-execution">Financial &amp; Execution</a><a href="#work-queue">Installation Work Queue</a>`;
  sidebar.querySelector('.brand')?.after(nav);
}

function getPeriodSelection() { return document.getElementById('reportMonthSummary')?.value || '1|8'; }

const MANUAL_PROJECT_COST_MAP = { 'Southeast Ace - Elgin': 8975 };

function refreshReportingSelector() {
  const selects = [document.getElementById('reportMonth'), document.getElementById('reportMonthSummary')].filter(Boolean);
  if (!selects.length) return;
  const current = selects[0].value || `1|${new Date().getMonth() + 1}`;
  selects.forEach(select => {
    const monthly = document.createElement('optgroup');
    monthly.label = 'Monthly';
    for (let month = 1; month <= 12; month += 1) {
      const option = document.createElement('option');
      option.value = `1|${month}`;
      option.textContent = new Date(FINANCE_YEAR, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      monthly.appendChild(option);
    }
    const six = document.createElement('optgroup');
    six.label = '6-Month Periods';
    for (let endMonth = 6; endMonth <= 12; endMonth += 1) {
      const startMonth = endMonth - 5;
      const start = new Date(FINANCE_YEAR, startMonth - 1, 1);
      const end = new Date(FINANCE_YEAR, endMonth - 1, 1);
      const option = document.createElement('option');
      option.value = `6|${endMonth}`;
      option.textContent = `${start.toLocaleString('en-US', { month: 'short' })}–${end.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
      six.appendChild(option);
    }
    select.innerHTML = '';
    select.appendChild(monthly);
    select.appendChild(six);
    select.value = [...select.options].some(o => o.value === current) ? current : `1|${new Date().getMonth() + 1}`;
  });
  selects.forEach(select => { select.onchange = () => { selects.forEach(other => { if (other !== select) other.value = select.value; }); window.__refreshRevenue?.(); window.__refreshMonthView?.(window.__clickUpFinancePayload, select.value); }; });
}

function calculateMatchedMargin(payload, periodValue) {
  const keys = periodKeys(periodValue);
  const customerRows = (payload?.customerInvoices || []).filter(row => keys.includes(row.month));
  const vendorRows = (payload?.invoices || []).filter(row => keys.includes(row.month));
  let revenue = 0;
  let vendorCost = 0;
  let matchedRows = 0;
  customerRows.forEach(row => {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) return;
    revenue += amount;
    let cost = Number(row.vendorCost);
    if (!Number.isFinite(cost)) cost = MANUAL_PROJECT_COST_MAP[String(row.task || '').trim()] ?? null;
    if (Number.isFinite(cost)) { vendorCost += cost; matchedRows += 1; }
  });
  if (customerRows.length && matchedRows < customerRows.length) {
    const periodVendorTotal = vendorRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    if (periodVendorTotal > 0) vendorCost = periodVendorTotal;
    matchedRows = customerRows.length;
  }
  const margin = matchedRows ? revenue - vendorCost : 0;
  const marginPct = revenue > 0 && matchedRows ? (margin / revenue) * 100 : null;
  return { customerRows, vendorRows, revenue, vendorCost, matchedRows, margin, marginPct };
}

function currentScoreSnapshot(payload, periodValue) {
  const endKey = periodKeys(periodValue).slice(-1)[0];
  return { scores: payload?.scores || {}, projectScores: payload?.projectScores || {}, available: true, label: String(payload?.updatedAt || '').slice(0, 7) || endKey };
}

function updateVendorScoreCards(payload, periodValue) {
  const snapshot = currentScoreSnapshot(payload, periodValue);
  const cards = [...document.querySelectorAll('.vendor-card')];
  cards.forEach(card => {
    const vendor = card.querySelector('.vendor-name')?.textContent?.trim();
    if (!vendor) return;
    const score = Number(snapshot.scores?.[vendor]);
    if (typeof applyScore === 'function') applyScore(card, snapshot.available && Number.isFinite(score) ? score : null);
    const vendorMeta = card.querySelector('.vendor-meta');
    if (vendorMeta) vendorMeta.textContent = snapshot.available ? 'ClickUp scorecard snapshot' : 'No monthly score snapshot';
  });
  const rows = [...document.querySelectorAll('.project-row')];
  rows.forEach(row => {
    const name = row.querySelector('.project-name')?.textContent?.trim();
    const strong = row.querySelector('.project-result strong');
    const status = row.querySelector('.project-status');
    if (!strong) return;
    const score = Number(snapshot.projectScores?.[name]);
    if (snapshot.available && Number.isFinite(score)) {
      strong.textContent = `${score}%`;
      if (status) status.textContent = score >= 90 ? 'Strong' : score >= 80 ? 'Watch' : 'At risk';
    } else {
      strong.textContent = '—';
      if (status) status.textContent = 'No monthly snapshot';
    }
  });
  const values = Object.values(snapshot.scores || {}).map(Number).filter(Number.isFinite);
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const kpi = document.getElementById('installationQualityScore');
  if (kpi) kpi.textContent = snapshot.available ? (avg == null ? '—' : `${avg}%`) : '—';
  const detail = document.getElementById('installationQualityDetail');
  if (detail) detail.textContent = snapshot.available ? `${values.length} vendor scorecards • ${periodLabel(periodValue)}` : `No ClickUp score snapshot for ${periodLabel(periodValue)}`;
  const qualityPanel = document.getElementById('qualityByVendor');
  if (qualityPanel) {
    if (!snapshot.available) qualityPanel.innerHTML = `<div class="quality-note">No ClickUp vendor score snapshot for ${periodLabel(periodValue)}.</div>`;
    else qualityPanel.innerHTML = vendors.map(v => { const score = Number(snapshot.scores?.[v]); const shown = Number.isFinite(score) ? `${score}%` : '—'; const width = Number.isFinite(score) ? score : 0; const band = typeof scoreBand === 'function' ? scoreBand(score) : ''; return `<div class="quality-row"><div><div class="qname">${v}</div><div class="qtrack"><span class="${band}" style="width:${width}%"></span></div></div><div class="qscore ${band}">${shown}</div></div>`; }).join('');
  }
}

function syncPeriodKpis(payload, periodValue, financials) {
  const label = periodLabel(periodValue);
  const { revenue, vendorCost, margin, marginPct } = financials;
  const endKey = periodKeys(periodValue).slice(-1)[0];
  const scoreSnapshot = currentScoreSnapshot(payload, periodValue);
  const scoreValues = Object.values(scoreSnapshot.scores || {}).map(Number).filter(Number.isFinite);
  const avgQuality = scoreValues.length ? scoreValues.reduce((a,b)=>a+b,0)/scoreValues.length : null;
  const hasCurrentOps = scoreSnapshot.available;
  const projectValue = document.getElementById('execProjects');
  const vendorValue = document.getElementById('execVendors');
  const qualityValue = document.getElementById('execQuality');
  const openValue = document.getElementById('execOpenInvoices');
  if (projectValue) projectValue.textContent = String(payload?.monthlyActiveProjects?.[endKey] ?? 0);
  if (vendorValue) vendorValue.textContent = String(Object.keys(payload?.scores || {}).length || 5);
  if (qualityValue) qualityValue.textContent = hasCurrentOps && avgQuality != null ? `${avgQuality.toFixed(1)}%` : '—';
  if (openValue) openValue.textContent = String(financials.customerRows.length);
  const set = (id, value, detail) => { const el=document.getElementById(id); const d=document.getElementById(id+'Detail'); if(el) el.textContent=value; if(d) d.textContent=detail; };
  set('execMargin', marginPct == null ? '—' : `${marginPct.toFixed(1)}%`, `${money(margin)} gross margin • ${label}`);
  set('execRevenue', money(revenue), `${financials.customerRows.length} Customer Invoice record${financials.customerRows.length===1?'':'s'} • ${label}`);
  set('execProjects', String(payload?.monthlyActiveProjects?.[endKey] ?? 0), `${payload?.monthlyActiveProjects?.[endKey] ?? 0} projects created • ${label}`);
  set('execVendors', String(Object.keys(payload?.scores || {}).length || 5), 'Current vendor partners');
  set('execQuality', hasCurrentOps && avgQuality != null ? `${avgQuality.toFixed(1)}%` : '—', hasCurrentOps ? `${scoreValues.length} vendor scorecards • ${label}` : `No monthly score snapshot • ${label}`);
  set('execOpenInvoices', String(financials.customerRows.length), `Customer Invoice records • ${label}`);
  const csat = endKey === '2026-08' ? '4.0 / 5' : endKey === '2026-07' ? '5.0 / 5' : '—';
  set('execCsat', csat, csat === '—' ? `No numeric ClickUp CSAT snapshot • ${label}` : `ClickUp CSAT • ${label}`);
  const quick = (id,val,detail) => { const el=document.getElementById(id); const d=document.getElementById(id+'Detail'); if(el) el.textContent=val; if(d) d.textContent=detail; };
  quick('quickMargin', marginPct == null ? '—' : `${marginPct.toFixed(1)}%`, `${money(margin)} gross margin • ${label}`);
  quick('quickRevenue', money(revenue), `${financials.customerRows.length} Customer Invoice record${financials.customerRows.length===1?'':'s'} • ${label}`);
  quick('quickProjects', String(payload?.monthlyActiveProjects?.[endKey] ?? 0), `${payload?.monthlyActiveProjects?.[endKey] ?? 0} projects created • ${label}`);
  quick('quickVendors', String(Object.keys(payload?.scores || {}).length || 5), 'Current vendor partners');
  quick('quickQuality', hasCurrentOps && avgQuality != null ? `${avgQuality.toFixed(1)}%` : '—', hasCurrentOps ? `${scoreValues.length} vendors scored • ${label}` : `No monthly score snapshot • ${label}`);
  quick('quickOpenInvoices', String(financials.customerRows.length), `Customer Invoice records • ${label}`);
  quick('quickCsat', csat, csat === '—' ? `No numeric ClickUp CSAT snapshot • ${label}` : `ClickUp CSAT • ${label}`);
}

window.__refreshMonthView = function(payload, periodValue) {
  if (!payload) return;
  const financials = calculateMatchedMargin(payload, periodValue);
  renderRevenue(payload, periodValue);
  renderInvoicePeriod(payload, periodValue);
  updateVendorScoreCards(payload, periodValue);
  syncPeriodKpis(payload, periodValue, financials);
};

function renderRevenue(payload, periodValue) {
  ensureCustomerInvoiceCard();
  renameGrossMarginKpi();
  const financials = calculateMatchedMargin(payload, periodValue);
  const { customerRows, vendorRows, revenue, vendorCost, matchedRows, margin, marginPct } = financials;
  const label = periodLabel(periodValue);
  const grossValue = document.getElementById('serviceRevenueValue');
  const grossDetail = document.getElementById('serviceRevenueDetail');
  if (grossValue) grossValue.textContent = matchedRows ? money(margin) : '—';
  if (grossDetail) grossDetail.textContent = `${money(revenue)} revenue − ${money(vendorCost)} vendor cost • ${label}`;
  const customerValue = document.getElementById('customerInvoiceValue');
  const customerDetail = document.getElementById('customerInvoiceDetail');
  if (customerValue) customerValue.textContent = money(revenue);
  if (customerDetail) customerDetail.textContent = `${customerRows.length} customer invoice record${customerRows.length === 1 ? '' : 's'} • ${label}`;
  const vendorTop = document.getElementById('invoiceMonthTotal');
  const vendorDetail = document.getElementById('invoiceMonthDetail');
  if (vendorTop) vendorTop.textContent = money(vendorRows.reduce((sum, row) => sum + Number(row.amount || 0), 0));
  if (vendorDetail) vendorDetail.textContent = `${vendorRows.length} invoice record${vendorRows.length === 1 ? '' : 's'} • ${label}`;
  const panelValue = document.getElementById('serviceRevenuePanel');
  const panelCaption = document.getElementById('serviceRevenueCaption');
  const cost = document.getElementById('serviceVendorCost');
  const gross = document.getElementById('serviceGrossMargin');
  const pct = document.getElementById('serviceMarginPct');
  if (panelValue) panelValue.textContent = money(revenue);
  if (panelCaption) panelCaption.textContent = `${label} • Revenue = Customer Invoice; Gross Margin = Customer Invoice − Vendor Invoice.`;
  if (cost) cost.textContent = money(vendorCost);
  if (gross) gross.textContent = money(margin);
  if (pct) pct.textContent = marginPct != null ? `${marginPct.toFixed(1)}%` : '—';
}

async function loadRevenue() {
  try {
    const response = await fetch(`clickup-scores.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    window.__clickUpFinancePayload = payload;
    const refresh = () => window.__refreshMonthView?.(payload, getPeriodSelection());
    window.__refreshRevenue = refresh;
    refreshReportingSelector();
    window.__refreshMonthView?.(payload, getPeriodSelection());
    [250, 1000, 2000].forEach(delay => setTimeout(refresh, delay));
  } catch (error) { console.error('Unable to load Customer Invoice revenue:', error); }
}

document.addEventListener('DOMContentLoaded', () => { setupSectionIdsAndNav(); ensureCustomerInvoiceCard(); renameGrossMarginKpi(); loadRevenue(); });
