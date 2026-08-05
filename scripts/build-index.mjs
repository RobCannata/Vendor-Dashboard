import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.CLICKUP_TOKEN;
const VIEW_ID = process.env.CLICKUP_VIEW_ID;
const LIST_ID = process.env.CLICKUP_LIST_ID;
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'dist';
const PAGE_SIZE = 100;
const API_BASE = 'https://api.clickup.com/api/v2';

if (!TOKEN || (!VIEW_ID && !LIST_ID)) {
  console.error('Missing CLICKUP_TOKEN and either CLICKUP_VIEW_ID or CLICKUP_LIST_ID.');
  process.exit(1);
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

function toIso(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function prettyStatusGroup(statusName, statusType) {
  const s = String(statusName || '').toLowerCase();
  const t = String(statusType || '').toLowerCase();
  if (t === 'closed' || s.includes('complete') || s.includes('done')) return 'Complete';
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('hold')) return 'On Hold';
  if (s.includes('sched')) return 'Scheduled';
  if (s.includes('prospective') || s.includes('pilot') || s.includes('future')) return 'Prospective';
  if (s.includes('quote') || s.includes('request') || s.includes('prep') || s.includes('sow') || s.includes('circulation')) return 'Commercial / Prep';
  return 'Other';
}

function fmtMonth(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
}

function addActivity(acc, field, iso) {
  if (!iso) return;
  const month = fmtMonth(iso);
  if (!month) return;
  acc.activityDates.push({ field, date: iso, month });
  if (!acc.activityMonths.includes(month)) acc.activityMonths.push(month);
  const year = new Date(iso).getUTCFullYear();
  if (!acc.years.includes(year)) acc.years.push(year);
  if (!acc.activityLabel) acc.activityLabel = month;
  else if (!acc.activityLabel.includes(month)) acc.activityLabel += ` / ${month}`;
}

function firstAssignee(task) {
  const assignees = Array.isArray(task?.assignees) ? task.assignees : [];
  const first = assignees[0];
  if (!first) return 'Unassigned';
  return first.username || first.email || first.initials || first.id || 'Unassigned';
}

function creatorName(task) {
  const creator = task?.creator || task?.user || {};
  return creator.username || creator.email || creator.name || '';
}

function guessWorkstream(task) {
  return (
    pickCustomField(task, ['Workstream', 'Work Stream', 'Program', 'Project Type']) ||
    task?.folder?.name ||
    task?.list?.name ||
    task?.space?.name ||
    'ClickUp'
  );
}

function normalizeTask(task) {
  const created = toIso(task?.date_created || task?.created_at || task?.created);
  const updated = toIso(task?.date_updated || task?.updated_at || task?.updated);
  const done = toIso(task?.date_done || task?.date_closed || task?.done_at || task?.completed_at);
  const start = toIso(task?.start_date || task?.start);
  const due = toIso(task?.due_date || task?.due);
  const statusName = task?.status?.status || task?.status?.name || task?.status || '';
  const statusType = task?.status?.type || '';
  const statusGroup = prettyStatusGroup(statusName, statusType);
  const priority = task?.priority?.priority || task?.priority?.name || task?.priority || 'NONE';
  const invoice = Number(pickCustomField(task, ['Vendor invoice', 'Vendor Invoice', 'Invoice', 'Cost', 'Vendor Cost']) || 0) || null;
  const address = pickCustomField(task, ['Address', 'Store Address', 'Location']) || '';
  const storeManager = pickCustomField(task, ['Store Manager', 'Manager']) || '';
  const storeSqft = pickCustomField(task, ['Store Sqft', 'SQFT', 'Square Feet']) || null;
  const tier = pickCustomField(task, ['Tier']) || '';
  const content = task?.description || task?.text_content || '';

  const acc = {
    id: task?.id || '',
    name: task?.name || '',
    status: String(statusName || '').toLowerCase(),
    statusLabel: String(statusName || ''),
    statusGroup,
    active: statusGroup !== 'Complete' && statusGroup !== 'Cancelled' && statusType !== 'closed',
    workstream: guessWorkstream(task),
    folder: task?.folder?.name || task?.list?.name || '',
    owner: firstAssignee(task),
    priority: String(priority || 'NONE').toUpperCase(),
    start,
    due,
    created,
    updated,
    done,
    years: [],
    invoice,
    invoiceRecorded: Number.isFinite(invoice),
    timeInStatusHours: 0,
    address,
    storeManager,
    storeSqft,
    tier,
    latestComment: content,
    content,
    commentCount: Number(task?.comment_count || task?.comments_count || 0),
    createdBy: creatorName(task),
    activityDates: [],
    activityMonths: [],
    activityLabel: '',
  };

  addActivity(acc, 'start', start);
  addActivity(acc, 'due', due);
  addActivity(acc, 'created', created);
  addActivity(acc, 'done', done);

  const ref = done || updated || created;
  if (ref) acc.timeInStatusHours = Math.max(0, Math.round(((Date.now() - new Date(ref).getTime()) / 36e5) * 10) / 10);
  if (!acc.activityLabel) acc.activityLabel = '—';
  if (!acc.years.length) acc.years = [new Date().getFullYear()];
  return acc;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: TOKEN,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ClickUp request failed (${res.status} ${res.statusText}): ${body.slice(0, 300)}`);
  }

  return res.json();
}

function buildEndpoint(page) {
  const endpoint = VIEW_ID
    ? `${API_BASE}/view/${VIEW_ID}/task`
    : `${API_BASE}/list/${LIST_ID}/task`;
  const url = new URL(endpoint);
  url.searchParams.set('page', String(page));
  if (!VIEW_ID) {
    url.searchParams.set('include_closed', 'true');
    url.searchParams.set('subtasks', 'true');
  }
  return url;
}

async function fetchAllTasks() {
  const results = [];
  let page = 0;
  let useZeroBased = true;

  while (true) {
    let data;
    try {
      data = await fetchJson(buildEndpoint(page));
    } catch (err) {
      if (page === 0 && useZeroBased) {
        useZeroBased = false;
        page = 1;
        continue;
      }
      throw err;
    }

    const tasks = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
    results.push(...tasks);
    if (tasks.length < PAGE_SIZE) break;
    page += 1;
  }

  return results.map(normalizeTask);
}

async function main() {
  const root = path.resolve(process.cwd());
  const indexHtml = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  const outDir = path.join(root, OUTPUT_DIR);
  await fs.mkdir(outDir, { recursive: true });

  const tasks = await fetchAllTasks();
  await fs.writeFile(path.join(outDir, 'clickup-data.json'), JSON.stringify(tasks, null, 2), 'utf8');
  await fs.writeFile(path.join(outDir, 'index.html'), indexHtml, 'utf8');

  console.log(`Built ${tasks.length} ClickUp task records.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
