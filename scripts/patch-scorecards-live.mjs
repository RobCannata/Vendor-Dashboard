import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.CLICKUP_TOKEN;
const LIST_ID = '901217460327';
const API_BASE = 'https://api.clickup.com/api/v2';
const filePath = path.resolve(process.cwd(), 'dist', 'index.html');

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
  const text = String(value).replace(/[,$\s%]/g, '');
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function normalizePercent(value) {
  const n = numeric(value);
  if (n == null) return null;
  if (n >= 0 && n <= 1) return n * 100;
  return n;
}

function getScore(task) {
  const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
  const preferred = ['Avg Final Score %', 'Avg Final Score', 'Final Score %', 'Final Score'];
  for (const name of preferred) {
    const field = fields.find((f) => String(f?.name || '').trim().toLowerCase() === name.toLowerCase());
    if (!field) continue;
    const value = normalizePercent(field?.value);
    if (value != null) return Math.round(value);
  }
  for (const field of fields) {
    const label = String(field?.name || '').trim().toLowerCase();
    if (!label.includes('avg') || !label.includes('final') || !label.includes('score')) continue;
    const value = normalizePercent(field?.value);
    if (value != null) return Math.round(value);
  }
  return null;
}

function vendorName(taskName) {
  const n = String(taskName || '').trim().toLowerCase();
  if (n.includes('channel partners')) return 'Channel Partners';
  if (n.includes('anderson')) return 'Anderson';
  if (n.includes('impulso')) return 'Impulso';
  if (n === 'sasr' || n.includes('sasr scorecard')) return 'SASR';
  if (n.includes('b2x')) return 'B2X';
  return null;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Authorization: TOKEN, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ClickUp request failed: ${res.status}`);
  return res.json();
}

async function fetchScorecards() {
  const all = [];
  let page = 0;
  while (true) {
    const data = await fetchJson(`${API_BASE}/list/${LIST_ID}/task?page=${page}&subtasks=false&include_closed=true&order_by=updated&reverse=true`);
    const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
    all.push(...tasks);
    if (tasks.length < 100) break;
    page += 1;
  }
  return all;
}

async function main() {
  const tasks = await fetchScorecards();
  const live = {};
  for (const task of tasks) {
    const vendor = vendorName(task?.name);
    const score = getScore(task);
    if (vendor && score != null) live[vendor] = score;
  }

  const sasrFallback = live.SASR ?? 100;
  live.SASR = sasrFallback;

  const injection = `<script>\n(function(){\n  const LIVE_SCORECARDS=${JSON.stringify(live)};\n  const vendorKey=v=>String(v||'').replace(/\\s+Scorecard$/i,'').trim();\n  const originals={scoreOfVendor:typeof scoreOfVendor==='function'?scoreOfVendor:null};\n  function scoreOverride(v){\n    const liveScore=LIVE_SCORECARDS[vendorKey(v.name)];\n    if(Number.isFinite(liveScore)) return liveScore;\n    return originals.scoreOfVendor ? originals.scoreOfVendor(v) : null;\n  }\n  if(typeof scoreOfVendor==='function') scoreOfVendor=scoreOverride;\n  if(typeof VENDORS!=='undefined') {\n    for(const v of VENDORS){ const s=LIVE_SCORECARDS[vendorKey(v.name)]; if(Number.isFinite(s)) v.liveFinalScore=s; }\n    if(!VENDORS.some(v=>vendorKey(v.name)==='SASR')){\n      VENDORS.push({name:'SASR',accent:'#e07a3f',icon:'SA',summary:'1 project',note:'Live ClickUp scorecard',criteria:[{label:'Execution',weight:25,value:5},{label:'Quality',weight:30,value:5},{label:'Communication',weight:20,value:5},{label:'Compliance',weight:15,value:5},{label:'Reliability',weight:10,value:5}],projects:[{name:'Dollar General Pilot',score:5,tone:'good'}],url:'https://app.clickup.com/t/869ed6zn3',liveFinalScore:LIVE_SCORECARDS.SASR});\n    }\n  }\n  function renderAll(){\n    if(typeof VENDORS==='undefined') return;\n    const avgItems=VENDORS.map(v=>({name:v.name,score:scoreOverride(v),color:v.accent,projects:v.projects.length})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);\n    const avg=document.getElementById('avgList');\n    if(avg) avg.innerHTML=avgItems.map(v=>'<a class="item" href="'+VENDORS.find(x=>x.name===v.name).url+'" target="_blank" rel="noreferrer"><div><b>'+String(v.name)+'</b><span>'+v.projects+' projects • live ClickUp Avg Final Score %</span><div style="height:8px;background:#e8edf6;border-radius:999px;overflow:hidden;margin-top:8px"><div style="height:100%;width:'+v.score+'%;background:'+v.color+'"></div></div></div><em>'+v.score+'%</em></a>').join('');\n    const quality=document.getElementById('kVendorQuality');\n    const scores=VENDORS.map(v=>scoreOverride(v)).filter(Number.isFinite);\n    if(quality) quality.textContent=scores.length?String(Math.round(scores.reduce((a,b)=>a+b,0)/scores.length))+'%':'—';\n    const count=document.getElementById('kScorecards');\n    if(count) count.textContent=String(VENDORS.length);\n    const grid=document.getElementById('vendorGrid');\n    if(grid && typeof renderVendor==='function') grid.innerHTML=VENDORS.map(renderVendor).join('');\n    const sheet=document.createElement('style');\n    sheet.textContent='.vendor-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important}.vendor-grid .vendor{min-width:0}@media(max-width:1400px){.vendor-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:820px){.vendor-grid{grid-template-columns:1fr!important}}';\n    document.head.appendChild(sheet);\n  }\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',renderAll); else renderAll();\n})();\n</script>`;

  const html = await fs.readFile(filePath, 'utf8');
  await fs.writeFile(filePath, html.replace('</body>', injection + '</body>'), 'utf8');
  console.log(`Injected live scorecards: ${JSON.stringify(live)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
