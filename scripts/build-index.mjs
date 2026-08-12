import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.CLICKUP_TOKEN;
const LIST_IDS = (process.env.CLICKUP_LIST_IDS || '901210415855,901218028445,901219830054,901219429938,901217460327')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'dist';
const API_BASE = 'https://api.clickup.com/api/v2';
const START_DATE = process.env.CLICKUP_START_DATE || '2026-01-01';
const END_DATE = process.env.CLICKUP_END_DATE || '';
const START_CUTOFF = new Date(`${START_DATE}T00:00:00Z`);
const END_CUTOFF = END_DATE ? new Date(`${END_DATE}T23:59:59.999Z`) : new Date();

if (!TOKEN) {
  console.error('Missing CLICKUP_TOKEN.');
  process.exit(1);
}

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const outDir = path.join(root, OUTPUT_DIR);
const dataPath = path.join(outDir, 'clickup-data.json');
const outIndexPath = path.join(outDir, 'index.html');

function cleanNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'object') {
    if (Array.isArray(value)) return cleanNumber(value[0]);
    if ('value' in value) return cleanNumber(value.value);
    if ('text' in value) return cleanNumber(value.text);
  }
  const text = String(value).replace(/[$,\s]/g, '').trim();
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function pickCustomField(task, names) {
  const wanted = names.map((n) => String(n || '').trim().toLowerCase()).filter(Boolean);
  const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
  for (const field of fields) {
    const label = String(field?.name || field?.label || '').trim().toLowerCase();
    if (!wanted.includes(label)) continue;
    const raw = field?.value;
    const cleaned = cleanNumber(raw);
    if (cleaned != null) return cleaned;
    if (raw == null || raw === '') continue;
    if (typeof raw === 'object') {
      if (Array.isArray(raw)) return raw.join(', ');
      if ('text' in raw && raw.text != null) return raw.text;
      return JSON.stringify(raw);
    }
    return raw;
  }
  return null;
}

function findAmountField(task, aliases, predicate) {
  const exact = pickCustomField(task, aliases);
  if (cleanNumber(exact) != null) return cleanNumber(exact);
  const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
  for (const field of fields) {
    const label = String(field?.name || field?.label || '').trim().toLowerCase();
    if (!predicate(label)) continue;
    const amount = cleanNumber(field?.value);
    if (amount != null) return amount;
  }
  return null;
}

function vendorInvoiceAmount(task) {
  return findAmountField(
    task,
    ['Vendor invoice', 'Vendor Invoice', 'Vendor Invoice Amount', 'Vendor Invoice Total', 'Vendor Cost', 'Vendor Cost Amount'],
    (label) => label.includes('vendor') && (label.includes('invoice') || label.includes('cost')) && !label.includes('status') && !label.includes('date')
  );
}

function customerInvoiceAmount(task) {
  return findAmountField(
    task,
    ['Customer invoice', 'Customer Invoice', 'Customer Invoice Amount', 'Customer Invoice Total', 'Customer Revenue'],
    (label) => (label.includes('customer') || label.includes('revenue')) && label.includes('invoice') && !label.includes('status') && !label.includes('date')
  );
}

function invoiceStatus(task) {
  const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
  for (const field of fields) {
    const label = String(field?.name || field?.label || '').trim().toLowerCase();
    if (!label.includes('vendor') || !label.includes('invoice') || !label.includes('status')) continue;
    const value = field?.value;
    if (value == null || value === '') continue;
    if (typeof value === 'object') return value.text || value.name || JSON.stringify(value);
    return String(value);
  }
  return null;
}

function toIso(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function statusGroup(statusName, statusType) {
  const s = String(statusName || '').toLowerCase();
  const t = String(statusType || '').toLowerCase();
  if (t === 'closed' || s.includes('complete') || s.includes('done') || s.includes('survey completed')) return 'Complete';
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('hold')) return 'On Hold';
  if (s.includes('sched')) return 'Scheduled';
  if (s.includes('prospective') || s.includes('pilot') || s.includes('future')) return 'Prospective';
  if (s.includes('quote') || s.includes('request') || s.includes('prep') || s.includes('sow') || s.includes('circulation')) return 'Commercial / Prep';
  return 'Other';
}

function firstAssignee(task) {
  const first = Array.isArray(task?.assignees) ? task.assignees[0] : null;
  if (!first) return 'Unassigned';
  return first.username || first.email || first.initials || first.id || 'Unassigned';
}

function workstream(task) {
  const fields = ['Workstream', 'Work Stream', 'Program', 'Project Type'];
  for (const name of fields) {
    const found = pickCustomField(task, [name]);
    if (found) return String(found);
  }
  return task?.folder?.name || task?.list?.name || task?.space?.name || 'ClickUp';
}

function normalizeTask(task) {
  const created = toIso(task?.date_created || task?.created_at || task?.created);
  const updated = toIso(task?.date_updated || task?.updated_at || task?.updated);
  const done = toIso(task?.date_done || task?.date_closed || task?.done_at || task?.completed_at);
  const start = toIso(task?.start_date || task?.start);
  const due = toIso(task?.due_date || task?.due);
  const statusName = task?.status?.status || task?.status?.name || task?.status || '';
  const statusType = task?.status?.type || '';
  const sg = statusGroup(statusName, statusType);
  const vendorInvoice = vendorInvoiceAmount(task);
  const customerInvoice = customerInvoiceAmount(task);
  const vendorInvoiceStatus = invoiceStatus(task);

  const row = {
    id: task?.id || '',
    name: task?.name || '',
    status: String(statusName || '').toLowerCase(),
    statusLabel: String(statusName || ''),
    statusGroup: sg,
    active: sg !== 'Complete' && sg !== 'Cancelled' && statusType !== 'closed',
    workstream: workstream(task),
    folder: task?.folder?.name || task?.list?.name || '',
    owner: firstAssignee(task),
    priority: String(task?.priority?.priority || task?.priority?.name || task?.priority || 'NONE').toUpperCase(),
    start,
    due,
    created,
    updated,
    done,
    years: [new Date().getFullYear()],
    invoice: vendorInvoice,
    invoiceRecorded: vendorInvoice != null,
    invoiceStatus: vendorInvoiceStatus,
    revenue: customerInvoice,
    revenueRecorded: customerInvoice != null,
    timeInStatusHours: 0,
    address: pickCustomField(task, ['Address', 'Store Address', 'Location']) || '',
    storeManager: pickCustomField(task, ['Store Manager', 'Manager']) || '',
    storeSqft: pickCustomField(task, ['Store Sqft', 'SQFT', 'Square Feet']) || null,
    tier: pickCustomField(task, ['Tier']) || '',
    latestComment: task?.description || task?.text_content || '',
    content: task?.description || task?.text_content || '',
    commentCount: Number(task?.comment_count || task?.comments_count || 0),
    createdBy: task?.creator?.username || task?.creator?.email || task?.creator?.name || '',
    activityMonths: [],
    activityLabel: '',
  };

  for (const iso of [start, due, created, done].filter(Boolean)) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;
    const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    if (!row.activityMonths.includes(month)) row.activityMonths.push(month);
    if (!row.activityLabel) row.activityLabel = month;
  }

  const ref = done || updated || created;
  if (ref) row.timeInStatusHours = Math.max(0, Math.round(((Date.now() - new Date(ref).getTime()) / 36e5) * 10) / 10);
  if (!row.activityLabel) row.activityLabel = '—';
  return row;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Authorization: TOKEN, Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ClickUp request failed (${res.status} ${res.statusText}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchListTasks(listId) {
  const results = [];
  let page = 0;
  let zeroBased = true;

  while (true) {
    const url = `${API_BASE}/list/${listId}/task?page=${page}&subtasks=true&include_closed=true&order_by=updated&reverse=true`;
    let data;

    try {
      data = await fetchJson(url);
    } catch (err) {
      if (page === 0 && zeroBased) {
        zeroBased = false;
        page = 1;
        continue;
      }
      throw err;
    }

    const tasks = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
    results.push(...tasks);
    if (tasks.length < 100) break;
    page += 1;
  }

  return results.map(normalizeTask);
}

async function fetchAllTasks() {
  const merged = new Map();
  for (const listId of LIST_IDS) {
    const tasks = await fetchListTasks(listId);
    for (const task of tasks) {
      if (!task?.id) continue;
      merged.set(task.id, task);
    }
  }
  return [...merged.values()];
}

function inWindow(task) {
  const dates = [task.created, task.start, task.due, task.done, task.updated].filter(Boolean);
  return dates.some((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date >= START_CUTOFF && date <= END_CUTOFF;
  });
}

function patchHtml(html) {
  let out = html;
  out = out.replace(/function renderBars\(target,items,valueFn,labelFn,formatFn,colors=WORKSTREAM_COLORS\)\{const max=Math\.max\(\.\.\.items\.map\(valueFn\),0\);/, 'function renderBars(target,items,valueFn,labelFn,formatFn,colors=WORKSTREAM_COLORS){const el=$(target);if(!el)return;const max=Math.max(...items.map(valueFn),0);');
  out = out.replace(/\$\(target\)\.innerHTML=/g, 'el.innerHTML=');
  out = out.replace("  $('resetBtn').onclick=()=>{", "  const resetBtn=$('resetBtn');\n  if(resetBtn) resetBtn.onclick=()=>{");
  return out;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const tasks = (await fetchAllTasks()).filter(inWindow);
  await fs.writeFile(dataPath, JSON.stringify(tasks, null, 2), 'utf8');
  const html = await fs.readFile(indexPath, 'utf8');
  await fs.writeFile(outIndexPath, patchHtml(html), 'utf8');
  console.log(`Built ${tasks.length} ClickUp task records from ${LIST_IDS.length} source lists.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});