import fs from 'node:fs/promises';

const TOKEN = process.env.CLICKUP_TOKEN;
const API_BASE = 'https://api.clickup.com/api/v2';
const OUTPUT = 'clickup-scores.json';
const YEAR = 2026;
const SCORECARD_LIST = '901217460327';
const INSTALLATION_LISTS = ['901201686156', '901210415855'];

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

// Pull the actual ClickUp Vendor Invoice custom field from installation tasks.
for (const listId of INSTALLATION_LISTS) {
  const listFields = await getListFields(listId);
  const vendorInvoiceField = customFieldByName(listFields, ['Vendor Invoice']);
  const vendorField = customFieldByName(listFields, ['Vendor', 'Vendor Name', 'Vendor Company']);

  if (!vendorInvoiceField) {
    console.warn(`List ${listId}: Vendor Invoice custom field was not found.`);
  } else {
    console.log(`List ${listId}: Vendor Invoice field ${vendorInvoiceField.id}`);
  }

  let invoicePage = 0;
  while (true) {
    const data = await getJson(`${API_BASE}/list/${listId}/task?page=${invoicePage}&subtasks=true&include_closed=true&order_by=created&reverse=false`);
    const tasks = Array.isArray(data?.tasks) ? data.tasks : [];

    for (const task of tasks) {
      const month = monthKey(task?.date_created);
      if (!month || !month.startsWith(`${YEAR}-`)) continue;

      const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
      const invoiceField = vendorInvoiceField ? fields.find((f) => String(f?.id) === String(vendorInvoiceField.id)) : null;
      const amount = amountFromField(invoiceField);
      if (amount == null || amount <= 0) continue;

      const vendorValue = vendorField ? fields.find((f) => String(f?.id) === String(vendorField.id)) : null;
      const vendor = vendorValue ? String(vendorValue.value?.label || vendorValue.value?.name || vendorValue.value?.text || vendorValue.value || '').trim() : '';

      invoices.push({
        taskId: task.id,
        task: task.name || 'Untitled',
        vendor: vendor || null,
        month,
        amount,
        sourceField: 'Vendor Invoice',
        url: task.url || `https://app.clickup.com/t/${task.id}`,
        createdAt: task.date_created,
      });
    }

    if (tasks.length < 100) break;
    invoicePage += 1;
  }
}

const invoiceMonthly = {};
for (const invoice of invoices) {
  invoiceMonthly[invoice.month] = (invoiceMonthly[invoice.month] || 0) + invoice.amount;
}

const invoiceByVendor = {};
for (const invoice of invoices) {
  const vendor = invoice.vendor || 'Unassigned';
  if (!invoiceByVendor[vendor]) invoiceByVendor[vendor] = 0;
  invoiceByVendor[vendor] += invoice.amount;
}

const payload = {
  source: 'ClickUp Field / Vendor Scorecards / Scorecards',
  field: 'Avg Final Score % / Final Score (%)',
  invoiceField: 'Vendor Invoice',
  updatedAt: new Date().toISOString(),
  scores,
  projectScores,
  invoices,
  invoiceMonthly,
  invoiceByVendor,
};

await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Updated vendor scores: ${JSON.stringify(scores)}`);
console.log(`Updated project scores: ${JSON.stringify(projectScores)}`);
console.log(`Extracted ${invoices.length} Vendor Invoice field records; monthly totals: ${JSON.stringify(invoiceMonthly)}`);
console.log(`Invoice totals by vendor: ${JSON.stringify(invoiceByVendor)}`);
