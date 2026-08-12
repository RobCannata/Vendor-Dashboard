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
const QUALITY_CARD = `<section class="card overall-quality" id="overallVendorQuality"><div class="overall-quality-inner"><div><div class="kpi-label">Overall Vendor Quality</div><div class="overall-quality-title">Weighted vendor scorecard average</div><div class="overall-quality-sub">Average of vendor final scores across the active scorecards.</div></div><div class="overall-quality-score" id="overallVendorQualityScore">—</div></div></section>`;
const QUALITY_CARD_ANCHOR = '<div class="layout">';
const QUALITY_STYLE = '<style>.vendor{min-height:0!important;height:auto!important}.vendor .projects{margin-top:4px}.overall-quality{margin:12px 0;background:linear-gradient(160deg,rgba(16,29,51,.97),rgba(10,20,37,.96));border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);overflow:hidden}.overall-quality-inner{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:16px 18px}.overall-quality-title{font-size:15px;font-weight:800;margin-top:4px}.overall-quality-sub{font-size:11px;color:var(--muted);margin-top:3px}.overall-quality-score{font-size:34px;font-weight:900;letter-spacing:-.05em;color:var(--accent)}@media(max-width:820px){.overall-quality-inner{align-items:flex-start}.overall-quality-score{font-size:28px}}</style>';

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

  if (!next.includes('id="overallVendorQuality"')) {
    next = next.includes('<head>') ? next.replace('<head>', '<head>' + QUALITY_STYLE) : QUALITY_STYLE + next;
    const anchorIndex = next.indexOf(QUALITY_CARD_ANCHOR);
    if (anchorIndex >= 0) {
      next = next.slice(0, anchorIndex) + QUALITY_CARD + next.slice(anchorIndex);
      replaced += 1;
    }
  }

  if (!next.includes('overallVendorQualityScore')) {
    next = next.replace('</body>', `<script>(function(){try{var scores=VENDORS.map(function(v){return scoreOfVendor(v)}).filter(function(v){return Number.isFinite(v)});var el=document.getElementById('overallVendorQualityScore');if(el){el.textContent=scores.length?String(Math.round(scores.reduce(function(a,b){return a+b},0)/scores.length))+'%':'—';}}catch(e){console.warn(e)}})();</script></body>`);
    replaced += 1;
  }

  if (replaced === 0) console.warn('No dashboard analytics strings were found to patch.');
  await fs.writeFile(filePath, next, 'utf8');
  console.log(`Patched dashboard analytics (${replaced} replacements).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
