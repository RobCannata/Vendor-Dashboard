import fs from 'node:fs/promises';

const TOKEN = process.env.CLICKUP_TOKEN;
const LIST_ID = '901217460327';
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

const PROJECT_NAMES = [
  'DHI',
  'Dollar General Pilot',
  'Natural Grocers',
  'Hucks Stores Pilot',
  'WMUS Top Stock',
  'WMUS Audits',
  'Academy Sports',
  'Miniso',
  'Ace Elgin',
  'Dufry',
  'Oxxo Revisits',
  'Food 4 Less',
];

function projectName(name) {
  const raw = String(name || '').trim();
  const match = PROJECT_NAMES.find((candidate) => candidate.toLowerCase() === raw.toLowerCase());
  return match || null;
}

function scoreForTask(task) {
  const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
  const preferred = ['Avg Final Score %', 'Avg Final Score', 'Final Score %', 'Final Score'];
  for (const name of preferred) {
    const field = fields.find((f) => String(f?.name || '').trim().toLowerCase() === name.toLowerCase());
    const score = percent(field?.value);
    if (score != null) return score;
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

async function getTasks() {
  const tasks = [];
  let page = 0;
  while (true) {
    const data = await getJson(`${API_BASE}/list/${LIST_ID}/task?page=${page}&subtasks=false&include_closed=true&order_by=updated&reverse=true`);
    const batch = Array.isArray(data?.tasks) ? data.tasks : [];
    tasks.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return tasks;
}

const tasks = await getTasks();
const scores = {};
const projectScores = {};

for (const task of tasks) {
  const score = scoreForTask(task);
  if (score == null) continue;

  const vendor = vendorName(task?.name);
  if (vendor) scores[vendor] = score;

  const project = projectName(task?.name);
  if (project) projectScores[project] = score;
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
