import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.CLICKUP_TOKEN;
const TEAM_ID = process.env.CLICKUP_TEAM_ID || '14341097';
const SCORECARD_LIST_ID = process.env.CLICKUP_SCORECARD_LIST_ID || '901217460327';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'dist';
const PAGE_SIZE = 100;
const API_BASE = 'https://api.clickup.com/api/v2';
const START_DATE = process.env.CLICKUP_START_DATE || '2026-01-01';
const END_DATE = process.env.CLICKUP_END_DATE || '';
const START_CUTOFF = new Date(`${START_DATE}T00:00:00Z`);
const END_CUTOFF = END_DATE ? new Date(`${END_DATE}T23:59:59.999Z`) : new Date();

const SCORECARD_CONST_RE = /const VENDOR_SCORECARDS = \[[\s\S]*?const SCORECARD_WEIGHTS = \[[\s\S]*?\];/;
const REMOVE_TITLES = [
  'Active projects by delivery stage',
  'Monthly projects added vs. completed',
  'Highest-cost projects',
];

if (!TOKEN) {
  console.error('Missing CLICKUP_TOKEN.');
  process.exit(1);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeSectionByTitle(html, title) {
  const escaped = escapeRegExp(title);
  const patterns = [
    new RegExp(`<article class="card">[\\s\\S]*?<h3>${escaped}<\\/h3>[\\s\\S]*?<\\/article>`, 'i'),
    new RegExp(`<section class="card">[\\s\\S]*?<h3>${escaped}<\\/h3>[\\s\\S]*?<\\/section>`, 'i'),
    new RegExp(`<article class="card">[\\s\\S]*?<h2>${escaped}<\\/h2>[\\s\\S]*?<\\/article>`, 'i'),
    new RegExp(`<section class="card">[\\s\\S]*?<h2>${escaped}<\\/h2>[\\s\\S]*?<\\/section>`, 'i'),
  ];

  let out = html;
  for (const pattern of patterns) {
    out = out.replace(pattern, '');
  }
  return out;
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
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
}

function addDateActivity(acc, field, iso) {
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
  const c = task?.creator || task?.user || {};
  return c.username || c.email || c.name || '';
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
    address: pickCustomField(task, ['Address', 'Store Address', 'Location']) || '',
    storeManager: pickCustomField(task, ['Store Manager', 'Manager']) || '',
    storeSqft: pickCustomField(task, ['Store Sqft', 'SQFT', 'Square Feet']) || null,
    tier: pickCustomField(task, ['Tier']) || '',
    latestComment: task?.description || task?.text_content || '',
    content: task?.description || task?.text_content || '',
    commentCount: Number(task?.comment_count || task?.comments_count || 0),
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
    headers: { Authorization: TOKEN, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ClickUp request failed (${res.status} ${res.statusText}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchPagedTasks(urlBuilder) {
  const results = [];
  let page = 0;
  let useZeroBased = true;

  while (true) {
    const url = urlBuilder(page);
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
    results.push(...tasks);
    if (tasks.length < PAGE_SIZE) break;
    page += 1;
  }

  return results.map(normalizeTask);
}

function isWithinRange(task) {
  const candidates = [task.created, task.start, task.due, task.done, task.updated].filter(Boolean);
  if (!candidates.length) return false;
  return candidates.some((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date >= START_CUTOFF && date <= END_CUTOFF;
  });
}

function numberField(task, names) {
  const value = pickCustomField(task, names);
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function scoreFromTask(task) {
  const direct = numberField(task, ['Final Score', 'Final', 'Vendor Score', 'Score', 'Overall', 'Total']);
  const quality = numberField(task, ['Quality', 'Quality Score']);

  if (Number.isFinite(direct)) {
    return { final: direct <= 5 ? Math.round(direct * 20) : direct, quality };
  }

  const dims = {
    execution: numberField(task, ['Execution', 'Execution Score']),
    quality,
    communication: numberField(task, ['Communication', 'Communication Score']),
    compliance: numberField(task, ['Compliance & Safety', 'Compliance', 'Safety']),
    reliability: numberField(task, ['Reliability', 'Reliability Score']),
  };
  const weights = { execution: 25, quality: 30, communication: 20, compliance: 15, reliability: 10 };
  const present = Object.values(dims).some((v) => Number.isFinite(v));
  if (!present) return { final: null, quality };

  let weighted = 0;
  let used = 0;
  for (const [key, v] of Object.entries(dims)) {
    if (!Number.isFinite(v)) continue;
    used += weights[key];
    weighted += (v <= 5 ? v / 5 : v / 100) * weights[key];
  }
  return { final: used ? Math.round(weighted * 10) / 10 : null, quality };
}

function deriveVendorShort(name) {
  return String(name || '')
    .replace(/\bscorecards?\b/ig, '')
    .replace(/\bscorecard\b/ig, '')
    .replace(/\brevisits\b/ig, 'Revisits')
    .replace(/\s+/g, ' ')
    .trim() || String(name || '').trim();
}

function buildScorecardData(rawTasks) {
  const parents = rawTasks.filter((t) => !t.parent);
  const liveChildren = rawTasks.filter((t) => t.parent);
  if (!parents.length) return null;

  const childrenByParent = new Map();
  for (const child of liveChildren) {
    if (!childrenByParent.has(child.parent)) childrenByParent.set(child.parent, []);
    childrenByParent.get(child.parent).push(child);
  }

  const order = ['Channel Partners', 'Anderson', 'Impulso', 'SASR'];
  const vendors = [];
  const projectDetail = {};

  for (const parent of parents) {
    const short = deriveVendorShort(parent.name);
    const children = (childrenByParent.get(parent.id) || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const childScores = children.map((c) => ({ task: c, ...scoreFromTask(c) }));
    const parentScore = scoreFromTask(parent);
    const scoreValues = [parentScore.final, ...childScores.map((x) => x.final)].filter((v) => Number.isFinite(v));
    const score = scoreValues.length ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 10) / 10 : null;
    const updated = [parent.updated, ...children.map((c) => c.updated)].filter(Boolean).sort().at(-1) || parent.updated || null;
    const projects = children.map((c) => c.name).filter(Boolean);

    vendors.push({
      vendor: short,
      short,
      taskId: parent.id,
      url: parent.url,
      projectCount: projects.length,
      updated,
      fields: Number(parent.custom_fields_count || 0),
      projects,
      note: projects.length
        ? `Live ClickUp vendor scorecard with ${projects.length} linked project${projects.length === 1 ? '' : 's'}.`
        : 'Live ClickUp vendor scorecard.',
      aliases: [...new Set([short, parent.name, ...projects].map((s) => String(s || '').trim().toLowerCase()).filter(Boolean))],
      score,
      scoreBasis: score != null ? 'Live ClickUp task data' : 'Live ClickUp task data (score not published)',
    });

    projectDetail[short] = {};
    for (const x of childScores) {
      projectDetail[short][x.task.name] = { final: x.final, quality: x.quality };
    }
  }

  vendors.sort((a, b) => order.indexOf(a.short) - order.indexOf(b.short));
  return { vendors, projectDetail };
}

async function main() {
  const root = path.resolve(process.cwd());
  const indexHtml = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  const outDir = path.join(root, OUTPUT_DIR);
  await fs.mkdir(outDir, { recursive: true });

  const mainTasks = await fetchPagedTasks((page) => {
    const url = new URL(`${API_BASE}/team/${TEAM_ID}/task`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('subtasks', 'true');
    url.searchParams.set('include_closed', 'true');
    url.searchParams.set('order_by', 'updated');
    url.searchParams.set('reverse', 'true');
    return url;
  });

  const filtered = mainTasks.filter(isWithinRange);
  await fs.writeFile(path.join(outDir, 'clickup-data.json'), JSON.stringify(filtered, null, 2), 'utf8');

  let html = indexHtml;
  try {
    const scoreTasks = await fetchPagedTasks((page) => {
      const url = new URL(`${API_BASE}/list/${SCORECARD_LIST_ID}/task`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('subtasks', 'true');
      url.searchParams.set('include_closed', 'true');
      return url;
    });

    const liveScorecards = buildScorecardData(scoreTasks);
    if (liveScorecards?.vendors?.length) {
      const replacement = `const VENDOR_SCORECARDS = ${JSON.stringify(liveScorecards.vendors, null, 2)};\nconst PROJECT_SCORE_DETAIL = ${JSON.stringify(liveScorecards.projectDetail, null, 2)};\nconst SCORECARD_WEIGHTS = [{"name":"Execution","weight":25},{"name":"Quality","weight":30},{"name":"Communication","weight":20},{"name":"Compliance & Safety","weight":15},{"name":"Reliability","weight":10}];`;
      html = html.replace(SCORECARD_CONST_RE, replacement);
    }
  } catch (err) {
    console.warn('Scorecard refresh failed; keeping bundled scorecard data:', err?.message || err);
  }

  for (const title of REMOVE_TITLES) {
    html = removeSectionByTitle(html, title);
  }

  await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
  console.log(`Built ${filtered.length} ClickUp task records.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});