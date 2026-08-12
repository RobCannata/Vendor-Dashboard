import fs from 'node:fs/promises';

const TOKEN = process.env.CLICKUP_TOKEN;
const API_BASE = 'https://api.clickup.com/api/v2';
const OUTPUT = 'clickup-scores.json';
const INSTALLATIONS_LIST = '901201686156';
const YEAR = 2026;

if (!TOKEN) throw new Error('Missing CLICKUP_TOKEN.');

function numeric(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    if ('value' in value) return numeric(value.value);
    if ('text' in value) return numeric(value.text);
    if ('name' in value) return numeric(value.name);
    if ('number' in value) return numeric(value.number);
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

function inferVendor(text) {
  const n = String(text || '').toLowerCase();
  if (n.includes('sasr')) return 'SASR';
  if (n.includes('anderson')) return 'Anderson';
  if (n.includes('channel partners')) return 'Channel Partners';
  if (n.includes('impulso')) return 'Impulso';
  if (n.includes('b2x')) return 'B2X';
  return null;
}

function extractInvoiceAmount(text) {
  const source = String(text || '');
  const line = source.match(/(?:vendor\s+invoice|invoice\s+amount)[^\n\r]*/i)?.[0];
  if (!line) return null;
  const amounts = [...line.matchAll(/\$\s*([0-9][0-9,]*(?:\.\d{1,2})?)/g)].map((m) => numeric(m[1])).filter((n) => n != null);
  if (!amounts.length) return null;
  if ((line.match(/=/g) || []).length >= 2) return amounts[amounts.length - 1];
  if (amounts.length === 1) return amounts[0];
  return amounts.reduce((a, b) => a + b, 0);
}

function monthKey(ms) {
  const date = new Date(Number(ms));
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

async function getJson(url) {
  const response = await fetch(url, { headers: { Authorization: TOKEN, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ClickUp ${response.status}: ${await response.text()}`);
  return response.json();
}

const scores = {};
const projectScores = {};
const invoices = [];

let page = 0;
while (true) {
  const data = await getJson(`${API_BASE}/list/901217460327/task?page=${page}&subtasks=true&include_closed=true&order_by=updated&reverse=true`);
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  for (const task of tasks) {
    const vendor = vendorName(task?.name);
    const score = scoreForTask(task);
    if (vendor && score != null) scores[vendor] = score;
  }
  if (tasks.length < 100) break;
  page += 1;
}

for (const [project, taskId] of Object.entries(PROJECT_TASKS)) {
  try {
    const task = await getJson(`${API_BASE}/task/${taskId}?include_subtasks=false`);
    const score = scoreForTask(task);
    if (score != null) projectScores[project] = score;
  } catch (error) {
    console.warn(`Project fetch failed for ${project}: ${error.message}`);
  }
}

// Pull installation tasks and extract Vendor Invoice amounts from task text.
// Month is based on ClickUp task creation date for a stable reporting period.
let invoicePage = 0;
while (true) {
  const data = await getJson(`${API_BASE}/list/${INSTALLATIONS_LIST}/task?page=${invoicePage}&subtasks=true&include_closed=true&order_by=created&reverse=false`);
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  for (const task of tasks) {
    const month = monthKey(task?.date_created);
    if (!month || !month.startsWith(`${YEAR}-`)) continue;
    const text = `${task?.name || ''}\n${task?.text_content || ''}\n${task?.description || ''}`;
    const amount = extractInvoiceAmount(text);
    if (amount == null || amount <= 0) continue;
    invoices.push({
      taskId: task.id,
      task: task.name || 'Untitled',
      vendor: inferVendor(text),
      month,
      amount,
      url: task.url || `https://app.clickup.com/t/${task.id}`,
      createdAt: task.date_created,
    });
  }
  if (tasks.length < 100) break;
  invoicePage += 1;
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
console.log(`Extracted ${invoices.length} vendor invoices; monthly totals: ${JSON.stringify(invoiceMonthly)}`);
console.log(`Invoice totals by vendor: ${JSON.stringify(invoiceByVendor)}`);
