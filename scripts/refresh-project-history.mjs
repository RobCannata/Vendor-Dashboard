import fs from 'node:fs/promises';

const TOKEN = process.env.CLICKUP_TOKEN;
const API_BASE = 'https://api.clickup.com/api/v2';
const OUTPUT = 'clickup-scores.json';
const YEAR = 2026;
const PROJECT_LISTS = ['901201686156', '901210415855', '170218462'];
const SCORECARD_LIST = '901217460327';

if (!TOKEN) throw new Error('Missing CLICKUP_TOKEN.');

function monthKey(ms) {
  const date = new Date(Number(ms));
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function numeric(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    if ('value' in value) return numeric(value.value);
    if ('text' in value) return numeric(value.text);
    if ('name' in value) return numeric(value.name);
    if ('number' in value) return numeric(value.number);
  }
  const n = Number(String(value).replace(/[,$\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function csatFromTask(task) {
  const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
  const target = fields.find((field) => String(field?.name || '').trim().toLowerCase() === 'csat (customer satisfaction) 1-4 rating');
  if (!target) return null;
  const candidates = [target.value, target.value?.value, target.value?.label, target.value?.name, target.value?.number, target.value?.text];
  for (const candidate of candidates) {
    const value = numeric(candidate);
    if (value != null && value >= 1 && value <= 4) return value;
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

const byId = new Map();
for (const listId of PROJECT_LISTS) {
  let page = 0;
  while (true) {
    const data = await getJson(
      `${API_BASE}/list/${listId}/task?page=${page}&subtasks=false&include_closed=true&order_by=created&reverse=false`
    );
    const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
    for (const task of tasks) {
      if (!task?.id || task?.parent) continue;
      const month = monthKey(task.date_created);
      if (!month || !month.startsWith(`${YEAR}-`)) continue;
      byId.set(String(task.id), {
        taskId: String(task.id),
        task: task.name || 'Untitled',
        status: task.status?.status || task.status || 'Unknown',
        url: task.url || `https://app.clickup.com/t/${task.id}`,
        createdAt: task.date_created,
        listId,
      });
    }
    if (tasks.length < 100) break;
    page += 1;
  }
}

const monthlyProjects = {};
const projectDetails = {};
for (const project of byId.values()) {
  const month = monthKey(project.createdAt);
  if (!month) continue;
  monthlyProjects[month] = (monthlyProjects[month] || 0) + 1;
  if (!projectDetails[month]) projectDetails[month] = [];
  projectDetails[month].push(project);
}

for (let month = 1; month <= 12; month += 1) {
  const key = `${YEAR}-${String(month).padStart(2, '0')}`;
  if (!(key in monthlyProjects)) monthlyProjects[key] = 0;
  if (!(key in projectDetails)) projectDetails[key] = [];
  projectDetails[key].sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
}

const monthlyCsatValues = {};
const monthlyCsatDetails = {};
let csatRecords = 0;
let scorecardPage = 0;
while (true) {
  const data = await getJson(
    `${API_BASE}/list/${SCORECARD_LIST}/task?page=${scorecardPage}&subtasks=true&include_closed=true&order_by=created&reverse=false`
  );
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  for (const task of tasks) {
    const candidates = [task, ...(Array.isArray(task?.subtasks) ? task.subtasks : [])];
    for (const item of candidates) {
      const value = csatFromTask(item);
      if (value == null) continue;
      const createdMonth = monthKey(item.date_created);
      if (!createdMonth || !createdMonth.startsWith(`${YEAR}-`)) continue;
      if (!monthlyCsatValues[createdMonth]) monthlyCsatValues[createdMonth] = [];
      monthlyCsatValues[createdMonth].push(value);
      if (!monthlyCsatDetails[createdMonth]) monthlyCsatDetails[createdMonth] = [];
      monthlyCsatDetails[createdMonth].push({ taskId: item.id, task: item.name || 'Untitled', value, createdAt: item.date_created, updatedAt: item.date_updated, url: item.url || `https://app.clickup.com/t/${item.id}` });
      csatRecords += 1;
    }
  }
  if (tasks.length < 100) break;
  scorecardPage += 1;
}

const monthlyCsat = {};
for (let month = 1; month <= 12; month += 1) {
  const key = `${YEAR}-${String(month).padStart(2, '0')}`;
  const values = monthlyCsatValues[key] || [];
  monthlyCsat[key] = values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
  if (!(key in monthlyCsatDetails)) monthlyCsatDetails[key] = [];
}

const payload = JSON.parse(await fs.readFile(OUTPUT, 'utf8'));
payload.monthlyProjects = monthlyProjects;
payload.projectDetails = projectDetails;
payload.monthlyActiveProjects = monthlyProjects;
payload.activeProjectDetails = projectDetails;
payload.monthlyCsat = monthlyCsat;
payload.monthlyCsatDetails = monthlyCsatDetails;
payload.csatField = 'CSAT (Customer Satisfaction) 1–4 rating';
payload.csatSource = 'ClickUp Scorecards; current custom-field values grouped by scorecard creation month in 2026';
payload.csatRecordCount = csatRecords;
payload.projectHistorySource = 'ClickUp installation/project tracker lists; top-level tasks only; open + closed; creation month in 2026';
payload.projectHistoryLists = PROJECT_LISTS;
payload.projectHistoryUpdatedAt = new Date().toISOString();

await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`2026 project history records: ${byId.size}`);
console.log(`2026 projects by creation month: ${JSON.stringify(monthlyProjects)}`);
console.log(`2026 CSAT records found: ${csatRecords}`);
console.log(`2026 CSAT by scorecard creation month: ${JSON.stringify(monthlyCsat)}`);
