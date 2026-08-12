import fs from 'node:fs/promises';

const TOKEN = process.env.CLICKUP_TOKEN;
const API_BASE = 'https://api.clickup.com/api/v2';
const OUTPUT = 'clickup-scores.json';

if (!TOKEN) {
  console.error('Missing CLICKUP_TOKEN.');
  process.exit(1);
}

function numeric(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    if ('value' in value) return numeric(value.value);
    if ('text' in value) return numeric(value.text);
    if ('name' in value) return numeric(value.name);
  }
  const n = Number(String(value).replace(/[,$\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function percent(value) {
  const n = numeric(value);
  if (n == null) return null;
  return Math.round(n >= 0 && n <= 1 ? n * 100 : n);
}

function vendorName(name) {
  const n = String(name || '').trim().toLowerCase();
  if (n.includes('channel partners')) return 'Channel Partners';
  if (n.includes('anderson') && n.includes('scorecard')) return 'Anderson';
  if (n === 'anderson') return 'Anderson';
  if (n.includes('impulso')) return 'Impulso';
  if (n === 'sasr' || n.includes('sasr scorecard')) return 'SASR';
  if (n.includes('b2x')) return 'B2X';
  return null;
}

function scoreForTask(task) {
  const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
  const preferred = ['Avg Final Score %', 'Avg Final Score', 'Final Score %', 'Final Score'];
  for (const name of preferred) {
    const field = fields.find((f) => String(f?.name || '').trim().toLowerCase() === name.toLowerCase());
    const score = percent(field?.value);
    if (score != null) return score;
  }
  for (const field of fields) {
    const label = String(field?.name || '').toLowerCase();
    if (label.includes('avg') && label.includes('final') && label.includes('score')) {
      const score = percent(field?.value);
      if (score != null) return score;
    }
  }
  return null;
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Authorization: TOKEN, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`ClickUp ${response.status}: ${await response.text()}`);
  return response.json();
}

async function getListTasks() {
  const tasks = [];
  let page = 0;
  while (true) {
    const data = await getJson(`${API_BASE}/list/901217460327/task?page=${page}&subtasks=true&include_closed=true&order_by=updated&reverse=true`);
    const batch = Array.isArray(data?.tasks) ? data.tasks : [];
    tasks.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return tasks;
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

const listTasks = await getListTasks();
const scores = {};
for (const task of listTasks) {
  const vendor = vendorName(task?.name);
  const score = scoreForTask(task);
  if (vendor && score != null) scores[vendor] = score;
}

const projectScores = {};
for (const [project, taskId] of Object.entries(PROJECT_TASKS)) {
  try {
    const task = await getJson(`${API_BASE}/task/${taskId}?include_subtasks=false`);
    const score = scoreForTask(task);
    if (score != null) projectScores[project] = score;
  } catch (err) {
    console.warn(`Project score fetch failed for ${project} (${taskId}):`, err.message);
  }
}

const payload = {
  source: 'ClickUp Field / Vendor Scorecards / Scorecards',
  field: 'Avg Final Score %',
  updatedAt: new Date().toISOString(),
  scores,
  projectScores,
};

await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Updated vendor scores: ${JSON.stringify(scores)}`);
console.log(`Updated project scores: ${JSON.stringify(projectScores)}`);
