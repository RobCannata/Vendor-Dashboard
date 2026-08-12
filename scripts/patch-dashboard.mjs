// Keep analytics cards aligned with the latest source template.
import fs from 'node:fs/promises';
import path from 'node:path';

const filePath = path.resolve(process.cwd(), 'dist', 'index.html');

const TREND_FROM = "const values=months.map(m=>({name:m.name,created:filtered.filter(d=>String(d.created||'').startsWith(m.key)).length,completed:filtered.filter(d=>String(d.done||'').startsWith(m.key)).length}));";
const TREND_TO = "const values=months.map(m=>({name:m.name,created:DATA.filter(d=>String(d.created||'').startsWith(m.key)).length,completed:DATA.filter(d=>String(d.done||'').startsWith(m.key)).length}));";

const TOP_FROM = "function renderTopCosts(){const items=filtered.filter(d=>d.invoiceRecorded&&d.invoice>0).sort((a,b)=>b.invoice-a.invoice).slice(0,7);renderBars('#topCostBars',items,x=>x.invoice,x=>x.name,n=>fmtMoney(n,true),['#9de05f','#4fc3f7','#9b8cff','#f6c85f','#5dd39e','#ff7a90','#5ea8ff'])}";
const TOP_TO = "function renderTopCosts(){const items=DATA.filter(d=>d.invoiceRecorded&&d.invoice>0).sort((a,b)=>b.invoice-a.invoice).slice(0,7);renderBars('#topCostBars',items,x=>x.invoice,x=>x.name,n=>fmtMoney(n,true),['#9de05f','#4fc3f7','#9b8cff','#f6c85f','#5dd39e','#ff7a90','#5ea8ff'])}";

const SCORE_FROM = "function scoreOfVendor(v){const vals=v.criteria.filter(c=>Number.isFinite(c.value)).map(c=>c.value);if(!vals.length) return null;const weighted=v.criteria.reduce((acc,c)=>acc+((c.value??0)*c.weight),0);return Math.round(weighted/5*20);}";
const SCORE_TO = "function scoreOfVendor(v){const scored=v.criteria.filter(c=>Number.isFinite(c.value)&&Number.isFinite(c.weight)&&c.weight>0);if(!scored.length)return null;const totalWeight=scored.reduce((acc,c)=>acc+c.weight,0);const weightedAverage=scored.reduce((acc,c)=>acc+((c.value??0)*c.weight),0)/totalWeight;return Math.round(Math.max(0,Math.min(5,weightedAverage))*20);}";

const WEIGHT_LABEL_FROM = '<div class="lbl">${esc(c.label)} (${c.weight}%)</div>';
const WEIGHT_LABEL_TO = '<div class="lbl">${esc(c.label)}</div>';
const PROJECT_DETAIL_FROM = '<em>${p.weight}%</em><em class="${p.tone}">${p.score==null?\'—\':`${scoreOf(p.score)}%`}</em><em class="${p.tone}">${p.margin==null?\'—\':fmtMoney(p.margin)}</em>';
const PROJECT_DETAIL_TO = '<em class="${p.tone}">${p.score==null?\'—\':`${scoreOf(p.score)}%`}</em>';
const QUALITY_FROM = "const avgPerf=vis.map(r=>r.perf).filter(v=>Number.isFinite(v));const overall=avgPerf.length?Math.round(avgPerf.reduce((a,b)=>a+b,0)/avgPerf.length):null;";
const QUALITY_TO = "const vendorScores=VENDORS.map(v=>scoreOfVendor(v)).filter(v=>Number.isFinite(v));const overall=vendorScores.length?Math.round(vendorScores.reduce((a,b)=>a+b,0)/vendorScores.length):null;";

const PROJECT_REGISTER_RE = /\s*<section class="card mini" style="margin-top:12px">\s*<div class="card-head"><div><h3>Project register<\/h3>[\s\S]*?<\/section>/;

async function main() {
  const html = await fs.readFile(filePath, 'utf8');
  let next = html;
  let replaced = 0;

  for (const [from,to] of [[TREND_FROM,TREND_TO],[TOP_FROM,TOP_TO],[SCORE_FROM,SCORE_TO],[WEIGHT_LABEL_FROM,WEIGHT_LABEL_TO],[PROJECT_DETAIL_FROM,PROJECT_DETAIL_TO],[QUALITY_FROM,QUALITY_TO]]) {
    if (next.includes(from)) { next = next.replace(from,to); replaced += 1; }
  }

  if (PROJECT_REGISTER_RE.test(next)) {
    next = next.replace(PROJECT_REGISTER_RE, '');
    replaced += 1;
  }

  if (replaced === 0) console.warn('No dashboard analytics strings were found to patch.');
  await fs.writeFile(filePath, next, 'utf8');
  console.log(`Patched dashboard analytics (${replaced} replacements).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
