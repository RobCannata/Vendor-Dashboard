import fs from 'node:fs/promises';

const TOKEN = process.env.CLICKUP_TOKEN;
const API_BASE = 'https://api.clickup.com/api/v2';
const OUTPUT = 'clickup-scores.json';
const YEAR = 2026;
const SCORECARD_LIST = '901217460327';
const ACTIVE_PROJECTS_LIST = '901210155082';
const INSTALLATION_LISTS = ['901201686156', '901210415855', '170218462'];

if (!TOKEN) throw new Error('Missing CLICKUP_TOKEN.');

function numeric(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    if ('value' in value) return numeric(value.value);
    if ('text' in value) return numeric(value.text);
    if ('name' in value) return numeric(value.name);
    if ('number' in value) return numeric(value.number);
    if ('amount' in value) return numeric(value.amount);
  }
  const n = Number(String(value).replace(/[,$\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function percent(value) {
  const n = numeric(value);
  if (n == null) return null;
  return Math.round(n >= 0 && n <= 1 ? n * 100 : n);
}

function scoreForTask(task) {
  const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
  const preferred = ['Avg Final Score %', 'Avg Final Score', 'Final Score (%)', 'Final Score %', 'Final Score'];
  for (const name of preferred) {
    const field = fields.find((f) => String(f?.name || '').trim().toLowerCase() === name.toLowerCase());
    const score = percent(field?.value);
    if (score != null) return score;
    const alt = percent(field?.formula?.value);
    if (alt != null) return alt;
  }
  for (const field of fields) {
    const label = String(field?.name || '').toLowerCase();
    if (label.includes('final') && label.includes('score')) {
      const score = percent(field?.value) ?? percent(field?.formula?.value);
      if (score != null) return score;
    }
  }
  return null;
}

function vendorName(name) {
  const n = String(name || '').trim().toLowerCase();
  if (n === 'sasr' || n.includes('sasr scorecard')) return 'SASR';
  if (n.includes('anderson') && n.includes('scorecard')) return 'Anderson';
  if (n.includes('channel partners')) return 'Channel Partners';
  if (n.includes('impulso')) return 'Impulso';
  if (n.includes('b2x')) return 'B2X';
  return null;
}

function monthKey(ms) {
  const date = new Date(Number(ms));
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function customFieldByName(fields, names) {
  const wanted = names.map((n) => n.toLowerCase());
  return (Array.isArray(fields) ? fields : []).find((f) => wanted.includes(String(f?.name || '').trim().toLowerCase()));
}

function amountFromField(field) {
  if (!field) return null;
  const candidates = [field.value, field.value?.value, field.value?.number, field.value?.amount, field.value?.text, field.currency_value, field.number];
  for (const candidate of candidates) {
    const n = numeric(candidate);
    if (n != null) return n;
  }
  return null;
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Authorization: TOKEN, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ClickUp ${response.status}: ${await response.text()}`);
  return response.json();
}

async function getListFields(listId) {
  try {
    const data = await getJson(`${API_BASE}/list/${listId}/field`);
    return Array.isArray(data?.fields) ? data.fields : [];
  } catch (error) {
    console.warn(`Unable to read custom fields for list ${listId}: ${error.message}`);
    return [];
  }
}

const scores = {};
const projectScores = {};
const invoices = [];
const customerInvoices = [];
const monthlyActiveProjects = {};
const activeProjectDetails = {};

let page = 0;
while (true) {
  const data = await getJson(`${API_BASE}/list/${SCORECARD_LIST}/task?page=${page}&subtasks=true&include_closed=true&order_by=updated&reverse=true`);
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  for (const task of tasks) {
    const vendor = vendorName(task?.name);
    const score = scoreForTask(task);
    if (vendor && score != null) scores[vendor] = score;
  }
  if (tasks.length < 100) break;
  page += 1;
}

let activeProjectPage = 0;
while (true) {
  const data = await getJson(`${API_BASE}/list/${ACTIVE_PROJECTS_LIST}/task?page=${activeProjectPage}&subtasks=false&include_closed=true&order_by=created&reverse=false`);
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  for (const task of tasks) {
    const month = monthKey(task?.date_created);
    if (!month || !month.startsWith(`${YEAR}-`)) continue;
    monthlyActiveProjects[month] = (monthlyActiveProjects[month] || 0) + 1;
    if (!activeProjectDetails[month]) activeProjectDetails[month] = [];
    activeProjectDetails[month].push({
      taskId: task.id,
      task: task.name || 'Untitled',
      status: task.status?.status || task.status || 'Unknown',
      url: task.url || `https://app.clickup.com/t/${task.id}`,
      createdAt: task.date_created,
    });
  }
  if (tasks.length < 100) break;
  activeProjectPage += 1;
}

const PROJECT_TASKS = {
  'DHI': '869ed6zzt',
  'Dollar General Pilot': '869ed6zxk',
  'Natural Grocers': '869ed78hy',
  'Hucks Stores Pilot': '869daqvck',
  'WMUS Top Stock': '869dvfp4w',
  'WMUS Audits': '869dvfnue',
  'Academy Sports': '869d1wf7v',
  'Miniso': '869ed7at4',
  'Ace Elgin': '869d4m6vq',
  'Dufry': '869dmfb7c',
  'Oxxo Revisits': '869duwa8r',
  'Food 4 Less': '869egpcpd',
};

for (const [project, taskId] of Object.entries(PROJECT_TASKS)) {
  try {
    const task = await getJson(`${API_BASE}/task/${taskId}?include_subtasks=false`);
    const score = scoreForTask(task);
    if (score != null) projectScores[project] = score;
  } catch (error) {
    console.warn(`Project fetch failed for ${project}: ${error.message}`);
  }
}

for (const listId of INSTALLATION_LISTS) {
  const listFields = await getListFields(listId);
  const vendorInvoiceField = customFieldByName(listFields, ['Vendor Invoice']);
  const customerInvoiceField = customFieldByName(listFields, ['Customer Invoice']);
  const vendorField = customFieldByName(listFields, ['Vendor', 'Vendor Name', 'Vendor Company']);

  console.log(`List ${listId}: Vendor Invoice field ${vendorInvoiceField?.id || 'not found'}; Customer Invoice field ${customerInvoiceField?.id || 'not found'}`);

  let invoicePage = 0;
  while (true) {
    const data = await getJson(`${API_BASE}/list/${listId}/task?page=${invoicePage}&subtasks=true&include_closed=true&order_by=created&reverse=false`);
    const tasks = Array.isArray(data?.tasks) ? data.tasks : [];

    for (const task of tasks) {
      const month = monthKey(task?.date_created);
      if (!month || !month.startsWith(`${YEAR}-`)) continue;

      const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
      const invoiceField = vendorInvoiceField ? fields.find((f) => String(f?.id) === String(vendorInvoiceField.id)) : null;
      const customerField = customerInvoiceField ? fields.find((f) => String(f?.id) === String(customerInvoiceField.id)) : null;
      const vendorAmount = amountFromField(invoiceField);
      const customerAmount = amountFromField(customerField);

      const vendorValue = vendorField ? fields.find((f) => String(f?.id) === String(vendorField.id)) : null;
      const vendor = vendorValue ? String(vendorValue.value?.label || vendorValue.value?.name || vendorValue.value?.text || vendorValue.value || '').trim() : '';

      if (vendorAmount != null && vendorAmount > 0) {
        invoices.push({ taskId: task.id, task: task.name || 'Untitled', vendor: vendor || null, month, amount: vendorAmount, sourceField: 'Vendor Invoice', url: task.url || `https://app.clickup.com/t/${task.id}`, createdAt: task.date_created });
      }

      if (customerAmount != null && customerAmount > 0) {
        const grossMargin = vendorAmount != null ? customerAmount - vendorAmount : null;
        const grossMarginPct = customerAmount > 0 && grossMargin != null ? (grossMargin / customerAmount) * 100 : null;
        customerInvoices.push({ taskId: task.id, task: task.name || 'Untitled', vendor: vendor || null, month, amount: customerAmount, vendorCost: vendorAmount, grossMargin, grossMarginPct, sourceField: 'Customer Invoice', url: task.url || `https://app.clickup.com/t/${task.id}`, createdAt: task.date_created });
      }
    }

    if (tasks.length < 100) break;
    invoicePage += 1;
  }
}

const invoiceMonthly = {};
for (const invoice of invoices) invoiceMonthly[invoice.month] = (invoiceMonthly[invoice.month] || 0) + invoice.amount;

const invoiceByVendor = {};
for (const invoice of invoices) {
  const vendor = invoice.vendor || 'Unassigned';
  invoiceByVendor[vendor] = (invoiceByVendor[vendor] || 0) + invoice.amount;
}

const revenueMonthly = {};
const revenueByVendor = {};
let totalRevenue = 0;
let totalVendorCost = 0;
let totalGrossMargin = 0;
let marginRecords = 0;
for (const invoice of customerInvoices) {
  revenueMonthly[invoice.month] = (revenueMonthly[invoice.month] || 0) + invoice.amount;
  const vendor = invoice.vendor || 'Unassigned';
  revenueByVendor[vendor] = (revenueByVendor[vendor] || 0) + invoice.amount;
  totalRevenue += invoice.amount;
  if (invoice.vendorCost != null) {
    totalVendorCost += invoice.vendorCost;
    totalGrossMargin += invoice.grossMargin;
    marginRecords += 1;
  }
}

for (let month = 1; month <= 12; month += 1) {
  const key = `${YEAR}-${String(month).padStart(2, '0')}`;
  if (!(key in monthlyActiveProjects)) monthlyActiveProjects[key] = 0;
  if (!(key in activeProjectDetails)) activeProjectDetails[key] = [];
}

const payload = {
  source: 'ClickUp Field / Vendor Scorecards / Scorecards',
  field: 'Avg Final Score % / Final Score (%)',
  invoiceField: 'Vendor Invoice',
  revenueField: 'Customer Invoice',
  activeProjectsList: ACTIVE_PROJECTS_LIST,
  projectHistorySource: 'ClickUp Active Projects list; open + closed tasks grouped by creation month',
  updatedAt: new Date().toISOString(),
  scores,
  projectScores,
  monthlyActiveProjects,
  activeProjectDetails,
  invoices,
  invoiceMonthly,
  invoiceByVendor,
  customerInvoices,
  revenueMonthly,
  revenueByVendor,
  totalRevenue,
  totalVendorCost,
  totalGrossMargin,
  marginRecords,
  totalMarginPct: totalRevenue > 0 && marginRecords > 0 ? (totalGrossMargin / totalRevenue) * 100 : null,
};

await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Updated vendor scores: ${JSON.stringify(scores)}`);
console.log(`Updated project scores: ${JSON.stringify(projectScores)}`);
console.log(`Projects by creation month: ${JSON.stringify(monthlyActiveProjects)}`);
console.log(`Extracted ${invoices.length} Vendor Invoice field records; monthly totals: ${JSON.stringify(invoiceMonthly)}`);
console.log(`Extracted ${customerInvoices.length} Customer Invoice field records; monthly revenue: ${JSON.stringify(revenueMonthly)}`);
console.log(`Revenue totals: ${JSON.stringify({ totalRevenue, totalVendorCost, totalGrossMargin, totalMarginPct: payload.totalMarginPct })}`);
