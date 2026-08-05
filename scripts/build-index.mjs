import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.CLICKUP_TOKEN;
const LIST_ID = process.env.CLICKUP_LIST_ID;
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'dist';
const PAGE_SIZE = 100;
const API_BASE = 'https://api.clickup.com/api/v2';

if (!TOKEN || !LIST_ID) {
  console.error('Missing CLICKUP_TOKEN or CLICKUP_LIST_ID.');
  process.exit(1);
}

function pickCustomField(task, names) {
  const wanted = names
    .map((n) => String(n || '').trim().toLowerCase())
    .filter(Boolean);
  if (!wanted.length) return null;

  const fields = Array.isArray(task.custom_fields) ? task.custom_fields : [];
  for (const field of fields) {
    const label = String(field.name || field.label || '').trim().toLowerCase();
    if (!wanted.includes(label)) continue;
    const value = field.value;
    if (value == null || value === '') continue;
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.join(', ');
      if ('value' in value && value.value != null) return value.value;
      return JSON.stringify(value);
    }
    return value;
  }
  return null;
}

function toIso(ts) {
  if (ts == null || ts === '') return null;
  if (typeof ts === 'string' && /^\d+$/.test(ts)) ts = Number(ts);
  if (typeof ts === 'number') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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

function fmtMonth(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
}

function addDateActivity(acc, field, iso) {
  if (!iso) return;
  const month = fmtMonth(iso);
  if (!month) return;
  acc.activityDates.push({ field, date: iso, month });
  if (!acc.activityMonths.includes(month)) acc.activityMonths.push(month);
  if (!acc.years.includes(new Date(iso).getUTCFullYear())) acc.years.push(new Date(iso).getUTCFullYear());
  if (!acc.activityLabel) acc.activityLabel = month;
  else if (!acc.activityLabel.includes(month)) acc.activityLabel += ` / ${month}`;
}

function firstAssignee(task) {
  const assignees = Array.isArray(task.assignees) ? task.assignees : [];
  const first = assignees[0];
  if (!first) return 'Unassigned';
  return first.username || first.email || first.initials || first.id || 'Unassigned';
}

function creatorName(task) {
  const c = task.creator || task.user || {};
  return c.username || c.email || c.name || '';
}

function guessWorkstream(task) {
  return (
    pickCustomField(task, ['Workstream', 'Work Stream', 'Program', 'Project Type']) ||
    task.folder?.name ||
    task.list?.name ||
    task.space?.name ||
    'ClickUp'
  );
}

function normalizeTask(task) {
  const created = toIso(task.date_created || task.created_at || task.created);
  const updated = toIso(task.date_updated || task.updated_at || task.updated);
  const done = toIso(task.date_done || task.date_closed || task.done_at || task.completed_at);
  const start = toIso(task.start_date || task.start);
  const due = toIso(task.due_date || task.due);
  const statusName = task.status?.status || task.status?.name || task.status || '';
  const statusType = task.status?.type || '';
  const statusGroup = prettyStatusGroup(statusName, statusType);
  const priority = task.priority?.priority || task.priority?.name || task.priority || 'NONE';

  const invoice = Number(
    pickCustomField(task, ['Vendor invoice', 'Vendor Invoice', 'Invoice', 'Cost', 'Vendor Cost']) || 0
  ) || null;

  const address = pickCustomField(task, ['Address', 'Store Address', 'Location']) || '';
  const storeManager = pickCustomField(task, ['Store Manager', 'Manager']) || '';
  const storeSqft = pickCustomField(task, ['Store Sqft', 'SQFT', 'Square Feet']) || null;
  const tier = pickCustomField(task, ['Tier']) || '';
  const latestComment = task.description || task.text_content || '';
  const content = task.description || task.text_content || '';

  const acc = {
    id: task.id || '',
    name: task.name || '',
    status: String(statusName || '').toLowerCase(),
    statusLabel: String(statusName || ''),
    statusGroup,
    active: statusGroup !== 'Complete' && statusGroup !== 'Cancelled' && statusType !== 'closed',
    workstream: guessWorkstream(task),
    folder: task.folder?.name || task.list?.name || '',
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
    latestComment,
    content,
    commentCount: Number(task.comment_count || task.comments_count || 0),
    createdBy: creatorName(task),
    activityDates: [],
    activityMonths: [],
    activityLabel: '',
  };

  addDateActivity(acc, 'start', start);
  addDateActivity(acc, 'due', due);
  addDateActivity(acc, 'created', created);
  addDateActivity(acc, 'done', done);

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

async function fetchAllTasks() {
  const results = [];
  let page = 0;
  let useZeroBased = true;

  while (true) {
    const url = new URL(`${API_BASE}/list/${LIST_ID}/task`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('subtasks', 'true');

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

    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    results.push(...tasks);

    if (tasks.length < PAGE_SIZE) break;
    page += 1;
  }

  return results.map(normalizeTask);
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[c]));
}

async function main() {
  const root = path.resolve(process.cwd());
  const indexHtml = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  const outDir = path.join(root, OUTPUT_DIR);
  await fs.mkdir(outDir, { recursive: true });

  const tasks = await fetchAllTasks();
  await fs.writeFile(path.join(outDir, 'clickup-data.json'), JSON.stringify(tasks, null, 2), 'utf8');

  // Copy the dashboard HTML to the build output so GitHub Pages can serve it.
  await fs.writeFile(path.join(outDir, 'index.html'), indexHtml, 'utf8');

  console.log(`Built ${tasks.length} ClickUp task records.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
