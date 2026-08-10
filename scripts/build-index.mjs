import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.CLICKUP_TOKEN;
const TEAM_ID = process.env.CLICKUP_TEAM_ID || '14341097';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'dist';
const PAGE_SIZE = 100;
const API_BASE = 'https://api.clickup.com/api/v2';
const START_DATE = process.env.CLICKUP_START_DATE || '2026-01-01';
const END_DATE = process.env.CLICKUP_END_DATE || '';
const START_CUTOFF = new Date(`${START_DATE}T00:00:00Z`);
const END_CUTOFF = END_DATE ? new Date(`${END_DATE}T23:59:59.999Z`) : new Date();

const ACTIVE_STAGE_CARD_RE = /<article class="card"><div class="card-head"><div><h3>Active projects by delivery stage<\/h3><p>Open project records grouped by their current operational status\.<\/p><\/div><span class="badge" id="activeBadge">0 active projects<\/span><\/div><div class="card-body"><div class="bar-list" id="activeBars"><\/div><\/div><\/article>/;

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
  for (const pattern of patterns) out = out.replace(pattern, '');
  return out;
}

function removeActiveProjectsCard(html) {
  if (ACTIVE_STAGE_CARD_RE.test(html)) {
    return html.replace(ACTIVE_STAGE_CARD_RE, '');
  }
  return removeSectionByTitle(html, 'Active projects by delivery stage');
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
  const revenue = Number(pickCustomField(task, ['Customer charge', 'Customer Charge', 'Charge', 'Billable', 'Revenue', 'Customer Revenue']) || 0) || null;

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
    revenue,
    revenueRecorded: Number.isFinite(revenue),
    timeInStatusHours: 0,
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

function buildPnLScript() {
  return [
    '<script>',
    '(function(){',
    '  function money(value, compact) {',
    '    var n = Number(value);',
    '    if (!Number.isFinite(n)) return "—";',
    '    if (compact) {',
    '      var abs = Math.abs(n);',
    '      if (abs >= 1e6) return "$" + (n / 1e6).toFixed(abs >= 1e7 ? 0 : 2).replace(/\\.00$/, "") + "M";',
    '      if (abs >= 1e3) return "$" + (n / 1e3).toFixed(abs >= 1e5 ? 0 : 1).replace(/\\.0$/, "") + "K";',
    '    }',
    '    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);',
    '  }',
    '',
    '  function getNumber(task, keys) {',
    '    var list = Array.isArray(keys) ? keys : [];',
    '    for (var i = 0; i < list.length; i++) {',
    '      var key = String(list[i] || "").trim().toLowerCase();',
    '      if (!key) continue;',
    '      for (var j = 0; j < (task.custom_fields || []).length; j++) {',
    '        var field = task.custom_fields[j] || {};',
    '        var name = String(field.name || field.label || "").trim().toLowerCase();',
    '        if (name !== key) continue;',
    '        var raw = field.value;',
    '        var num = Number(raw);',
    '        if (Number.isFinite(num)) return num;',
    '      }',
    '      var fallback = Number(task[key]);',
    '      if (Number.isFinite(fallback)) return fallback;',
    '    }',
    '    return 0;',
    '  }',
    '',
    '  function renderPnL() {',
    '    var cards = document.querySelectorAll(".main-kpi-card");',
    '    var card = cards[2];',
    '    var data = window.DATA || [];',
    '    if (!card || !Array.isArray(data)) return;',
    '',
    '    var revenue = 0;',
    '    var cost = 0;',
    '',
    '    for (var i = 0; i < data.length; i++) {',
    '      var task = data[i] || {};',
    '      revenue += getNumber(task, ["Customer charge", "Customer Charge", "Charge", "Billable", "Revenue", "Customer Revenue", "customerCharge", "customerRevenue"]);',
    '      cost += getNumber(task, ["Vendor invoice", "Vendor Invoice", "Invoice", "Cost", "Vendor Cost", "invoice", "vendorCost"]);',
    '    }',
    '',
    '    var profit = revenue - cost;',
    '    var margin = revenue ? Math.round((profit / revenue) * 100) : null;',
    '    var title = "P&L";',
    '    var subtitle = revenue > 0 ? "Customer charge less vendor invoice." : "Customer charge is not captured yet; vendor invoice is still tracked.";',
    '    var note = revenue > 0 ? "Customer charge = revenue • Vendor invoice = direct cost" : "Add a customer charge field in ClickUp to show live revenue.";',
    '',
    '    card.innerHTML =',
    '      \'<div class="main-kpi-head"><div class="main-kpi-title"><span class="main-kpi-index">3</span><div><h3>\' + title + \'</h3><p>\' + subtitle + \'</p></div></div><span class="main-kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20m5-16H9a3 3 0 0 0 0 6h6a3 3 0 1 1 0 6H6" stroke-width="1.7"/></svg></span></div>\' +',
    '      \'<div class="main-kpi-value">\' + money(revenue, true) + \'<small>revenue</small></div>\' +',
    '      \'<div class="main-kpi-sub">Gross profit \' + money(profit, true) + \' • margin \' + (margin == null ? "—" : margin + "%") + \'</div>\' +',
    '      \'<div class="main-kpi-stats"><div class="main-kpi-stat"><span>Customer charge</span><b>\' + money(revenue, true) + \'</b></div><div class="main-kpi-stat"><span>Vendor invoice</span><b>\' + money(cost, true) + \'</b></div><div class="main-kpi-stat"><span>Gross profit</span><b>\' + money(profit, true) + \'</b></div></div>\' +',
    '      \'<div class="main-kpi-foot"><span class="kpi-data-gap"><i></i>\' + note + \'</span><a href="#financials">Open model</a></div>\';',
    '  }',
    '',
    '  if (document.readyState === "loading") {',
    '    document.addEventListener("DOMContentLoaded", renderPnL, { once: true });',
    '  } else {',
    '    renderPnL();',
    '  }',
    '})();',
    '</script>',
  ].join('\n');
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
  html = removeActiveProjectsCard(html);
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${buildPnLScript()}</body>`);
  } else {
    html += buildPnLScript();
  }

  await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
  console.log(`Built ${filtered.length} ClickUp task records.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});