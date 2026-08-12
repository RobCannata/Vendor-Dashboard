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
const VENDOR_HEIGHT_RE = /\.vendor\{display:flex;flex-direction:column;min-height:760px\}/;
const VENDOR_HEIGHT_TO = '.vendor{display:flex;flex-direction:column;min-height:0;height:auto}';
const OVERALL_QUALITY_RE = /\s*<section class="card overall-quality" id="overallVendorQuality">[\s\S]*?<\/section>/;
const OVERALL_QUALITY_STYLE = `<style id="dashboard-polish">
.kpis{grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:10px 0 12px}
.kpi{min-height:96px;padding:13px 14px;border-radius:14px;background:linear-gradient(160deg,rgba(18,32,54,.98),rgba(10,20,37,.98));box-shadow:0 10px 30px rgba(0,0,0,.18);border-color:rgba(255,255,255,.09)}
.kpi:before{width:62px;height:62px;right:-18px;top:-18px;background:rgba(89,198,255,.06)}
.kpi-top{align-items:center}
.kpi-label{font-size:9px;letter-spacing:.13em;font-weight:800;color:#9aa9be}
.kpi-icon{width:26px;height:26px;border-radius:8px;font-size:12px;background:rgba(255,255,255,.05)}
.kpi-value{font-size:25px;margin:11px 0 6px;letter-spacing:-.045em}
.kpi-meta{font-size:9px}
#scores{margin-top:0;border-color:rgba(89,198,255,.16);box-shadow:0 16px 45px rgba(0,0,0,.22)}
#scores .card-head{padding:16px 18px 11px;min-height:68px}
#scores .card-head h3{font-size:16px;letter-spacing:-.02em}
#scores .card-head p{font-size:11px;max-width:620px}
#scores .body{padding:0 18px 18px}
#scores .list{gap:12px;grid-template-columns:repeat(5,minmax(0,1fr));display:grid}
#scores .item{padding:16px 16px;border-radius:10px;min-width:0;min-height:150px;aspect-ratio:1.2 / 1;align-items:stretch;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(160deg,rgba(255,255,255,.045),rgba(255,255,255,.018));border-color:rgba(255,255,255,.10);box-shadow:0 12px 30px rgba(0,0,0,.16)}
#scores .item b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#scores .item span{font-size:9px;line-height:1.35;white-space:normal;overflow:visible;text-overflow:clip;margin-top:7px}
#scores .item em{font-size:18px;letter-spacing:-.02em}
#scores .item > div > div{height:9px!important;margin-top:11px!important}
#scores .item > div > div > div{box-shadow:0 0 10px rgba(89,198,255,.16)}
@media(max-width:1400px){.kpis{grid-template-columns:repeat(3,minmax(0,1fr))}#scores .list{grid-template-columns:repeat(2,minmax(0,1fr))}#scores .item{aspect-ratio:auto;min-height:150px}}
@media(max-width:820px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}#scores .list{grid-template-columns:1fr}#scores .item{aspect-ratio:auto;min-height:130px}}
</style>`;

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

  if (VENDOR_HEIGHT_RE.test(next)) {
    next = next.replace(VENDOR_HEIGHT_RE, VENDOR_HEIGHT_TO);
    replaced += 1;
  }

  if (OVERALL_QUALITY_RE.test(next)) {
    next = next.replace(OVERALL_QUALITY_RE, '');
    replaced += 1;
  }

  if (!next.includes('id="dashboard-polish"')) {
    next = next.includes('</head>') ? next.replace('</head>', OVERALL_QUALITY_STYLE + '</head>') : OVERALL_QUALITY_STYLE + next;
    replaced += 1;
  }

  // Preserve a simple overall score calculation for the KPI row; the separate redundant card is intentionally removed.
  next = next.replace(/\s*<script>\(function\(\)\{try\{var scores=VENDORS\.map\(function\(v\)\{return scoreOfVendor\(v\)\}\)\.filter\(function\(v\)\{return Number\.isFinite\(v\)\}\);var el=document\.getElementById\('overallVendorQualityScore'\);if\(el\)\{el\.textContent=scores\.length\?String\(Math\.round\(scores\.reduce\(function\(a,b\)\{return a\+b\},0\)\/scores\.length\)\)\+'%'\:'—'\;\}\}catch\(e\)\{console\.warn\(e\)\}\}\)\(\);<\/script>/, '');

  if (replaced === 0) console.warn('No dashboard analytics strings were found to patch.');
  await fs.writeFile(filePath, next, 'utf8');
  console.log(`Patched dashboard analytics (${replaced} replacements).`);
}

main().catch((err) => { console.error(err); process.exit(1); });