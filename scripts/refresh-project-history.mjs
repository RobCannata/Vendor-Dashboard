import fs from 'node:fs/promises';

const TOKEN = process.env.CLICKUP_TOKEN;
const API_BASE = 'https://api.clickup.com/api/v2';
const OUTPUT = 'clickup-scores.json';
const YEAR = 2026;
const PROJECT_LISTS = ['901201686156', '901210415855', '170218462'];

if (!TOKEN) throw new Error('Missing CLICKUP_TOKEN.');

function monthKey(ms) {
  const date = new Date(Number(ms));
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

const payload = JSON.parse(await fs.readFile(OUTPUT, 'utf8'));
payload.monthlyProjects = monthlyProjects;
payload.projectDetails = projectDetails;
payload.monthlyActiveProjects = monthlyProjects;
payload.activeProjectDetails = projectDetails;
payload.projectHistorySource = 'ClickUp installation/project tracker lists; top-level tasks only; open + closed; creation month in 2026';
payload.projectHistoryLists = PROJECT_LISTS;
payload.projectHistoryUpdatedAt = new Date().toISOString();

await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`2026 project history records: ${byId.size}`);
console.log(`2026 projects by creation month: ${JSON.stringify(monthlyProjects)}`);
