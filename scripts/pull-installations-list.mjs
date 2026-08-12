import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.CLICKUP_TOKEN;
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'dist';
const API_BASE = 'https://api.clickup.com/api/v2';
const PAGE_SIZE = 100;
const START_DATE = process.env.CLICKUP_START_DATE || new Date(Date.now() - 183 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const END_DATE = process.env.CLICKUP_END_DATE || new Date().toISOString().slice(0, 10);
const START_CUTOFF = new Date(`${START_DATE}T00:00:00Z`);
const END_CUTOFF = new Date(`${END_DATE}T23:59:59.999Z`);

// Pull only list sources; folders are not fetchable with the ClickUp list task endpoint.
const SOURCES = [
  { type: 'list', id: '901210415855', label: 'Installations Main Tracker' },
  { type: 'list', id: '901218028445', label: 'Hucks Stores 135 Rollout' },
  { type: 'list', id: '901219830054', label: 'Family Dollar (5 Pilots)' },
  { type: 'list', id: '901219429938', label: 'New White Glove Installations' },
  { type: 'list', id: '901217460327', label: 'Scorecards' },
];

if (!TOKEN) {
  console.error('Missing CLICKUP_TOKEN.');
  process.exit(1);
}

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
    const value = field?.value;
    if (value == null || value === '') continue;
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.join(', ');
      if ('value' in value && value.value != null) return value.value;
      if ('text' in value && value.text != null) return value.text;
      return JSON.stringify(value);
    }
    return value;
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

// Vendor Cost must come from the ClickUp "Vendor Invoice" field.
// Common variants are accepted, but the explicit Vendor Invoice field is first priority.
function vendorInvoiceAmount(task) {
  return findAmountField(
    task,
    ['Vendor Invoice', 'Vendor invoice', 'Vendor Invoice Amount', 'Vendor Invoice Total', 'Vendor Cost', 'Vendor Cost Amount'],
    (label) => label.includes('vendor') && label.includes('invoice') && !label.includes('status') && !label.includes('date')
  );
}

function customerInvoiceAmount(task) {
  return findAmountField(
    task,
    ['Customer Invoice', 'Customer invoice', 'Customer Invoice Amount', 'Customer Invoice Total', 'Customer Revenue'],
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

function prettyStatusGroup(statusName, statusType) {
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
  const assignees = Array.isArray(task?.assignees) ? task.assignees : [];
  const first = assignees[0];
  if (!first) return 'Unassigned';
  return first.username || first.email || first.initials || first.id || 'Unassigned';
}

function creatorName(task) {
  const c = task?.creator || task?.user || {};
  return c.username || c.email || c.name || '';
}

function guessWorkstream(task, sourceLabel) {
  return (
    task?.folder?.name ||
    task?.list?.name ||
    sourceLabel ||
    task?.space?.name ||
    'ClickUp'
  );
}

function normalizeTask(task, sourceLabel) {
  const created = toIso(task?.date_created || task?.created_at || task?.created);
  const updated = toIso(task?.date_updated || task?.updated_at || task?.updated);
  const done = toIso(task?.date_done || task?.date_closed || task?.done_at || task?.completed_at);
  const start = toIso(task?.start_date || task?.start);
  const due = toIso(task?.due_date || task?.due);
  const statusName = task?.status?.status || task?.status?.name || task?.status || '';
  const statusType = task?.status?.type || '';
  const statusGroup = prettyStatusGroup(statusName, statusType);
  const priority = task?.priority?.priority || task?.priority?.name || task?.priority || 'NONE';
  const vendorInvoice = vendorInvoiceAmount(task);
  const customerInvoice = customerInvoiceAmount(task);
  const vendorInvoiceStatus = invoiceStatus(task);

  const acc = {
    id: task?.id || '',
    name: task?.name || '',
    status: String(statusName || '').toLowerCase(),
    statusLabel: String(statusName || ''),
    statusGroup,
    active: statusGroup !== 'Complete' && statusGroup !== 'Cancelled' && statusType !== 'closed',
    workstream: guessWorkstream(task, sourceLabel),
    folder: task?.folder?.name || task?.list?.name || '',
    owner: firstAssignee(task),
    priority: String(priority || 'NONE').toUpperCase(),
    start,
    due,
    created,
    updated,
    done,
    years: [],
    timeInStatusHours: 0,
    invoice: vendorInvoice,
    invoiceRecorded: vendorInvoice != null,
    invoiceStatus: vendorInvoiceStatus,
    revenue: customerInvoice,
    revenueRecorded: customerInvoice != null,
    address: pickCustomField(task, ['Address', 'Store Address', 'Location']) || '',
    storeManager: pickCustomField(task, ['Store Manager', 'Manager']) || '',
    storeSqft: pickCustomField(task, ['Store Sqft', 'SQFT', 'Square Feet']) || null,
    tier: pickCustomField(task, ['Tier']) || '',
    latestComment: task?.description || task?.text_content || '',
    content: task?.description || task?.text_content || '',
    commentCount: Number(task?.comment_count || task?.comments_count || 0),
    createdBy: creatorName(task),
    activityMonths: [],
    activityLabel: '',
  };

  const activityDates = [start, due, created, done].filter(Boolean);
  for (const iso of activityDates) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;
    const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    if (!acc.activityMonths.includes(month)) acc.activityMonths.push(month);
    if (!acc.activityLabel) acc.activityLabel = month;
  }

  const ref = done || updated || created;
  if (ref) {
    const diff = Date.now() - new Date(ref).getTime();
    acc.timeInStatusHours = Math.max(0, Math.round((diff / 36e5) * 10) / 10);
  }

  if (!acc.activityLabel) acc.activityLabel = '—';
  if (!acc.years.length) acc.years = [new Date().getFullYear()];
  return acc;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Authorization: TOKEN, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ClickUp request failed (${res.status} ${res.statusText}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchPagedTasks(source) {
  const results = [];
  let page = 0;
  let useZeroBased = true;

  while (true) {
    const url = new URL(`${API_BASE}/${source.type}/${source.id}/task`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('subtasks', 'true');
    url.searchParams.set('include_closed', 'true');
    url.searchParams.set('order_by', 'updated');
    url.searchParams.set('reverse', 'true');

    let data;
    try {
      data = await fetchJson(url);
    } catch (err) {
      if (page === 0 && useZeroBased) {
        useZeroBased = false;
        page = 1;
        continue;
      }
      throw err;
    }

    const tasks = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
    results.push(...tasks.map((task) => normalizeTask(task, source.label)));
    if (tasks.length < PAGE_SIZE) break;
    page += 1;
  }

  return results;
}

function isWithinRange(task) {
  const candidates = [task.created, task.start, task.due, task.done, task.updated].filter(Boolean);
  if (!candidates.length) return false;
  return candidates.some((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date >= START_CUTOFF && date <= END_CUTOFF;
  });
}

async function main() {
  const root = path.resolve(process.cwd());
  const outDir = path.join(root, OUTPUT_DIR);
  await fs.mkdir(outDir, { recursive: true });

  const allTasks = [];
  for (const source of SOURCES) {
    const tasks = await fetchPagedTasks(source);
    allTasks.push(...tasks);
  }

  const unique = [...new Map(allTasks.map((task) => [task.id, task])).values()];
  const filtered = unique.filter(isWithinRange);

  await fs.writeFile(path.join(outDir, 'clickup-data.json'), JSON.stringify(filtered, null, 2), 'utf8');
  console.log(`Pulled ${filtered.length} tasks from ClickUp sources for ${START_DATE} through ${END_DATE}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});