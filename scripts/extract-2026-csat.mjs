const TOKEN = process.env.CLICKUP_TOKEN;
const API_BASE = 'https://api.clickup.com/api/v2';
const FOLDER_ID = '901210655304';
const YEAR = 2026;

if (!TOKEN) throw new Error('Missing CLICKUP_TOKEN.');

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Authorization: TOKEN, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`ClickUp ${response.status}: ${await response.text()}`);
  return response.json();
}

function monthKey(ms) {
  const date = new Date(Number(ms));
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[–—-]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function ratingValue(field) {
  const candidates = [
    field?.value,
    field?.value?.value,
    field?.value?.label,
    field?.value?.name,
    field?.value?.number,
    field?.value?.text,
    field?.number,
    field?.text,
  ];
  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue;
    const value = Number(String(candidate).replace(/[^0-9.]/g, ''));
    if (Number.isFinite(value) && value >= 1 && value <= 4) return value;
  }
  return null;
}

const folder = await getJson(`${API_BASE}/folder/${FOLDER_ID}/list`);
const lists = Array.isArray(folder?.lists) ? folder.lists : [];
console.log(`Tracker folder lists: ${lists.length}`);
console.log(JSON.stringify(lists.map((list) => ({ id: list.id, name: list.name }))));

const tasksById = new Map();
for (const list of lists) {
  let page = 0;
  while (true) {
    const data = await getJson(`${API_BASE}/list/${list.id}/task?page=${page}&subtasks=false&include_closed=true&order_by=created&reverse=false`);
    const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
    for (const task of tasks) {
      const month = monthKey(task?.date_created);
      if (!month || !month.startsWith(`${YEAR}-`)) continue;
      tasksById.set(String(task.id), { ...task, list_id: list.id, list_name: list.name });
    }
    if (tasks.length < 100) break;
    page += 1;
  }
}

console.log(`2026 tracker tasks found: ${tasksById.size}`);

const monthly = {};
const details = {};
let tasksInspected = 0;
let fieldsFound = 0;

for (const task of tasksById.values()) {
  const detail = await getJson(`${API_BASE}/task/${task.id}?include_subtasks=true`);
  tasksInspected += 1;
  const candidates = [detail, ...(Array.isArray(detail?.subtasks) ? detail.subtasks : [])];

  for (const item of candidates) {
    const month = monthKey(item?.date_created);
    if (!month || !month.startsWith(`${YEAR}-`)) continue;
    const fields = Array.isArray(item?.custom_fields) ? item.custom_fields : [];

    for (const field of fields) {
      const normalized = normalizeName(field?.name);
      if (!normalized.includes('csat') || !normalized.includes('customer satisfaction')) continue;
      fieldsFound += 1;
      const value = ratingValue(field);
      if (value == null) continue;
      if (!monthly[month]) monthly[month] = [];
      monthly[month].push(value);
      if (!details[month]) details[month] = [];
      details[month].push({
        taskId: item.id,
        task: item.name || 'Untitled',
        list: task.list_name,
        value,
        createdAt: item.date_created,
        updatedAt: item.date_updated,
        url: item.url || `https://app.clickup.com/t/${item.id}`,
        fieldName: field.name,
      });
    }
  }
}

const output = {};
for (let month = 1; month <= 12; month += 1) {
  const key = `${YEAR}-${String(month).padStart(2, '0')}`;
  const values = monthly[key] || [];
  output[key] = values.length
    ? {
        average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
        count: values.length,
        values,
        details: details[key] || [],
      }
    : { average: null, count: 0, values: [], details: [] };
}

console.log(`CSAT fields found: ${fieldsFound}`);
console.log('2026 CSAT monthly results:');
console.log(JSON.stringify(output, null, 2));
