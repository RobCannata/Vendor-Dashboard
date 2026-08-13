const REPORTING_OVERRIDE_YEAR = 2026;

function reportingPeriodKeys(value) {
  const [countRaw, endRaw] = String(value || '1|1').split('|');
  const count = Number(countRaw) || 1;
  const endMonth = Number(endRaw) || 1;
  const startMonth = Math.max(1, endMonth - count + 1);
  return Array.from({length: endMonth - startMonth + 1}, (_, i) => `${REPORTING_OVERRIDE_YEAR}-${String(startMonth + i).padStart(2, '0')}`);
}

function reportingPeriodLabel(value) {
  const [countRaw, endRaw] = String(value || '1|1').split('|');
  const count = Number(countRaw) || 1;
  const endMonth = Number(endRaw) || 1;
  const startMonth = Math.max(1, endMonth - count + 1);
  const end = new Date(REPORTING_OVERRIDE_YEAR, endMonth - 1, 1);
  const start = new Date(REPORTING_OVERRIDE_YEAR, startMonth - 1, 1);
  const endLabel = end.toLocaleString('en-US', {month:'short', year:'numeric'});
  if (count === 1) return endLabel;
  return `${start.toLocaleString('en-US', {month:'short'})}–${endLabel}`;
}

function rebuildReportingSelector() {
  const selects = [document.getElementById('reportMonth'), document.getElementById('reportMonthSummary')].filter(Boolean);
  if (!selects.length) return;
  const groups = [];

  const monthly = document.createElement('optgroup');
  monthly.label = 'Monthly';
  for (let m = 1; m <= 12; m++) {
    const o = document.createElement('option');
    o.value = `1|${m}`;
    o.textContent = new Date(REPORTING_OVERRIDE_YEAR, m - 1, 1).toLocaleString('en-US', {month:'long', year:'numeric'});
    monthly.appendChild(o);
  }
  groups.push(monthly);

  const three = document.createElement('optgroup');
  three.label = '3-Month Periods';
  for (let end = 3; end <= 12; end++) {
    const o = document.createElement('option');
    o.value = `3|${end}`;
    o.textContent = `${reportingPeriodLabel(o.value)} — 3 Month View`;
    three.appendChild(o);
  }
  groups.push(three);

  const six = document.createElement('optgroup');
  six.label = '6-Month Periods';
  for (let end = 6; end <= 12; end++) {
    const o = document.createElement('option');
    o.value = `6|${end}`;
    o.textContent = `${reportingPeriodLabel(o.value)} — 6 Month View`;
    six.appendChild(o);
  }
  groups.push(six);

  selects.forEach(select => {
    const current = select.value || `1|${new Date().getMonth()+1}`;
    select.innerHTML = '';
    groups.forEach(group => select.appendChild(group.cloneNode(true)));
    select.value = current;
  });
}

function refreshGrossMarginFromPeriodData() {
  const payload = window.__clickUpFinancePayload;
  const select = document.getElementById('reportMonthSummary') || document.getElementById('reportMonth');
  if (!payload || !select) return;
  const keys = reportingPeriodKeys(select.value);
  const customerRows = Array.isArray(payload.customerInvoices) ? payload.customerInvoices.filter(r => keys.includes(r.month)) : [];
  const vendorRows = Array.isArray(payload.invoices) ? payload.invoices.filter(r => keys.includes(r.month)) : [];
  const revenue = customerRows.reduce((s,r) => s + Number(r.amount || 0), 0);
  const vendorCost = vendorRows.reduce((s,r) => s + Number(r.amount || 0), 0);
  const margin = revenue - vendorCost;
  const marginPct = revenue ? (margin / revenue) * 100 : null;

  const grossValue = document.getElementById('serviceRevenueValue');
  const grossDetail = document.getElementById('serviceRevenueDetail');
  if (grossValue) grossValue.textContent = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(margin);
  if (grossDetail) grossDetail.textContent = `${reportingPeriodLabel(select.value)} • Customer invoices ${customerRows.length}, vendor invoices ${vendorRows.length}`;

  const customerValue = document.getElementById('customerInvoiceValue');
  const customerDetail = document.getElementById('customerInvoiceDetail');
  if (customerValue) customerValue.textContent = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(revenue);
  if (customerDetail) customerDetail.textContent = `${customerRows.length} customer invoice record${customerRows.length===1?'':'s'} • ${reportingPeriodLabel(select.value)}`;

  const panelValue = document.getElementById('serviceRevenuePanel');
  const cost = document.getElementById('serviceVendorCost');
  const gross = document.getElementById('serviceGrossMargin');
  const pct = document.getElementById('serviceMarginPct');
  const caption = document.getElementById('serviceRevenueCaption');
  if (panelValue) panelValue.textContent = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(revenue);
  if (cost) cost.textContent = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(vendorCost);
  if (gross) gross.textContent = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(margin);
  if (pct) pct.textContent = marginPct == null ? '—' : `${marginPct.toFixed(1)}%`;
  if (caption) caption.textContent = `${reportingPeriodLabel(select.value)} • Gross margin = Customer Invoices − Vendor Invoices`;
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    rebuildReportingSelector();
    ['reportMonth','reportMonthSummary'].forEach(id => document.getElementById(id)?.addEventListener('change', () => setTimeout(refreshGrossMarginFromPeriodData, 50)));
  }, 2500);
});
