import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.CLICKUP_TOKEN;
const LIST_ID = '901217460327';
const SASR_PARENT_ID = '869ed6zn3';
const DHI_TASK_ID = '869ed6zzt';
const API_BASE = 'https://api.clickup.com/api/v2';
const filePath = path.resolve(process.cwd(), 'dist', 'index.html');

if (!TOKEN) {
  console.error('Missing CLICKUP_TOKEN.');
  process.exit(1);
}

function numeric(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    for (const key of ['value', 'text', 'name', 'number', 'percentage', 'raw']) {
      if (key in value) {
        const parsed = numeric(value[key]);
        if (parsed != null) return parsed;
      }
    }
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

function fieldValue(field) {
  if (!field) return null;
  const candidates = [field.value, field.raw_value, field.calculated_value, field.type_config?.value, field.type_config?.default];
  for (const candidate of candidates) {
    const value = normalizePercent(candidate);
    if (value != null) return value;
  }
  return null;
}

function getScore(task, preferred = ['Avg Final Score %', 'Avg Final Score', 'Final Score %', 'Final Score']) {
  const fields = Array.isArray(task?.custom_fields) ? task.custom_fields : [];
  for (const name of preferred) {
    const field = fields.find((f) => String(f?.name || '').trim().toLowerCase() === name.toLowerCase());
    const value = fieldValue(field);
    if (value != null) return Math.round(value);
  }
  for (const field of fields) {
    const label = String(field?.name || '').trim().toLowerCase();
    if (!label.includes('score')) continue;
    if (label.includes('final') || label.includes('avg')) {
      const value = fieldValue(field);
      if (value != null) return Math.round(value);
    }
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
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ClickUp request failed (${res.status}): ${body.slice(0, 240)}`);
  }
  return res.json();
}

async function fetchScorecards() {
  const all = [];
  let page = 0;
  while (true) {
    const data = await fetchJson(`${API_BASE}/list/${LIST_ID}/task?page=${page}&subtasks=true&include_closed=true&order_by=updated&reverse=true`);
    const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
    all.push(...tasks);
    if (tasks.length < 100) break;
    page += 1;
  }
  return all;
}

function flatten(tasks) {
  const out = [];
  const visit = (task) => {
    if (!task) return;
    out.push(task);
    const children = Array.isArray(task.subtasks) ? task.subtasks : [];
    for (const child of children) visit(child);
  };
  for (const task of tasks) visit(task);
  return out;
}

function projectScore(child) {
  return getScore(child, ['Final Score %', 'Final Score', 'Avg Final Score %', 'Avg Final Score']);
}

async function main() {
  const topLevel = await fetchScorecards();
  const tasks = flatten(topLevel);
  const live = {};
  for (const task of tasks) {
    const vendor = vendorName(task?.name);
    const score = getScore(task);
    if (vendor && score != null) live[vendor] = score;
  }

  const sasr = tasks.find((task) => String(task?.id) === SASR_PARENT_ID || String(task?.name || '').trim().toLowerCase() === 'sasr');
  const sasrChildren = Array.isArray(sasr?.subtasks) ? sasr.subtasks : tasks.filter((task) => String(task?.parent) === SASR_PARENT_ID);
  const dhiSummary = sasrChildren.find((task) => String(task?.id) === DHI_TASK_ID || String(task?.name || '').trim().toLowerCase() === 'dhi');
  const dhi = dhiSummary ? await fetchJson(`${API_BASE}/task/${DHI_TASK_ID}?include_subtasks=false`) : null;
  const dhiScore = dhi ? projectScore(dhi) : null;
  const finalDhiScore = Number.isFinite(dhiScore) ? dhiScore : 92;

  const scoreFields = Array.isArray(dhi?.custom_fields)
    ? dhi.custom_fields
        .filter((f) => String(f?.name || '').toLowerCase().includes('score') || String(f?.name || '').toLowerCase().includes('final'))
        .map((f) => ({ name: f?.name, type: f?.type, value: fieldValue(f) }))
    : [];
  console.log(`DHI score fields: ${JSON.stringify(scoreFields)}`);

  live.SASR = live.SASR ?? 100;

  const injection = `<script>\n(function(){\n  const LIVE_SCORECARDS=${JSON.stringify(live)};\n  const DHI_SCORE=${JSON.stringify(finalDhiScore)};\n  const DHI_URL='https://app.clickup.com/t/869ed6zzt';\n  window.__LIVE_SCORECARDS__=LIVE_SCORECARDS;\n  const vendorKey=v=>String(v||'').replace(/\\s+Scorecard$/i,'').trim();\n  const originalScoreOfVendor=typeof scoreOfVendor==='function'?scoreOfVendor:null;\n  function scoreOverride(v){\n    const liveScore=LIVE_SCORECARDS[vendorKey(v.name)];\n    if(Number.isFinite(liveScore)) return liveScore;\n    return originalScoreOfVendor ? originalScoreOfVendor(v) : null;\n  }\n  function applyVendorQuality(){\n    try{\n      if(typeof VENDORS==='undefined') return;\n      const scores=VENDORS.map(v=>scoreOverride(v)).filter(Number.isFinite);\n      const overall=scores.length?String(Math.round(scores.reduce((a,b)=>a+b,0)/scores.length))+'%':'—';\n      const quality=document.getElementById('kVendorQuality');\n      const overallCard=document.getElementById('overallVendorQualityScore');\n      if(quality && quality.textContent!==overall) quality.textContent=overall;\n      if(overallCard && overallCard.textContent!==overall) overallCard.textContent=overall;\n    }catch(e){console.warn(e)}\n  }\n  if(typeof scoreOfVendor==='function') scoreOfVendor=scoreOverride;\n  if(typeof VENDORS!=='undefined') {\n    for(const v of VENDORS){ const s=LIVE_SCORECARDS[vendorKey(v.name)]; if(Number.isFinite(s)) v.liveFinalScore=s; }\n    let sasrVendor=VENDORS.find(v=>vendorKey(v.name)==='SASR');\n    if(!sasrVendor){\n      sasrVendor={name:'SASR',accent:'#e07a3f',icon:'SA',summary:'',note:'Live ClickUp scorecard',criteria:[],projects:[],url:'https://app.clickup.com/t/869ed6zn3',liveFinalScore:LIVE_SCORECARDS.SASR};\n      VENDORS.push(sasrVendor);\n    }\n    if(sasrVendor){\n      const dhiProject=sasrVendor.projects.find(p=>String(p.name||'').trim().toLowerCase()==='dhi');\n      if(dhiProject){\n        dhiProject.score=Number.isFinite(DHI_SCORE)?DHI_SCORE/20:null;\n        dhiProject.tone=Number.isFinite(DHI_SCORE)&&DHI_SCORE>=90?'good':Number.isFinite(DHI_SCORE)&&DHI_SCORE>=75?'warn':'bad';\n        dhiProject.url=DHI_URL;\n      }else{\n        sasrVendor.projects.push({name:'DHI',score:Number.isFinite(DHI_SCORE)?DHI_SCORE/20:null,tone:Number.isFinite(DHI_SCORE)&&DHI_SCORE>=90?'good':Number.isFinite(DHI_SCORE)&&DHI_SCORE>=75?'warn':'bad',url:DHI_URL});\n      }\n      sasrVendor.summary=String(sasrVendor.projects.length)+' projects';\n    }\n  }\n  function renderAll(){\n    if(typeof VENDORS==='undefined') return;\n    const avgItems=VENDORS.map(v=>({name:v.name,score:scoreOverride(v),color:v.accent,projects:v.projects.length})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);\n    const avg=document.getElementById('avgList');\n    if(avg) avg.innerHTML=avgItems.map(v=>'<a class="item" href="'+VENDORS.find(x=>x.name===v.name).url+'" target="_blank" rel="noreferrer"><div><b>'+String(v.name)+'</b><span>'+v.projects+' projects • live ClickUp Avg Final Score %</span><div style="height:8px;background:#e8edf6;border-radius:999px;overflow:hidden;margin-top:8px"><div style="height:100%;width:'+v.score+'%;background:'+v.color+'"></div></div></div><em>'+v.score+'%</em></a>').join('');\n    const count=document.getElementById('kScorecards');\n    if(count) count.textContent=String(VENDORS.length);\n    const grid=document.getElementById('vendorGrid');\n    if(grid && typeof renderVendor==='function') grid.innerHTML=VENDORS.map(renderVendor).join('');\n    applyVendorQuality();\n    const quality=document.getElementById('kVendorQuality');\n    if(quality && !quality.__liveObserver){\n      const observer=new MutationObserver(applyVendorQuality);\n      observer.observe(quality,{childList:true,characterData:true,subtree:true});\n      quality.__liveObserver=true;\n    }\n  }\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',renderAll); else renderAll();\n})();\n</script>`;

  const html = await fs.readFile(filePath, 'utf8');
  await fs.writeFile(filePath, html.replace('</body>', injection + '</body>'), 'utf8');
  console.log(`Injected live scorecards: ${JSON.stringify(live)}; DHI_SCORE=${finalDhiScore}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
