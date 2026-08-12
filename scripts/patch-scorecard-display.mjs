import fs from 'node:fs/promises';
import path from 'node:path';

const filePath = path.resolve(process.cwd(), 'dist', 'index.html');

async function main(){
  let html=await fs.readFile(filePath,'utf8');
  const before=html;
  html=html.replace(/<div class="lbl">\$\{esc\(c\.label\)\} \(\$\{c\.weight\}%\)<\/div>/g,'<div class="lbl">${esc(c.label)}</div>');
  html=html.replace(/<em>\$\{p\.weight\}%<\/em><em class="\$\{p\.tone\}">\$\{p\.score==null\?'—':`\$\{scoreOf\(p\.score\)\}%`\}<\/em><em class="\$\{p\.tone\}">\$\{p\.margin==null\?'—':fmtMoney\(p\.margin\)\}<\/em>/g,'<em class="${p.tone}">${p.score==null?\'—\':`${scoreOf(p.score)}%`}</em>');
  html=html.replace(/const avgPerf=vis\.map\(r=>r\.perf\)\.filter\(v=>Number\.isFinite\(v\);\?[^;]+;?/g, (m)=>m);
  html=html.replace(/const avgPerf=vis\.map\(r=>r\.perf\)\.filter\(v=>Number\.isFinite\(v\)\);const overall=avgPerf\.length\?Math\.round\(avgPerf\.reduce\(\(a,b\)=>a\+b,0\)\/avgPerf\.length\):null;/,'const vendorScores=VENDORS.map(v=>scoreOfVendor(v)).filter(v=>Number.isFinite(v));const overall=vendorScores.length?Math.round(vendorScores.reduce((a,b)=>a+b,0)/vendorScores.length):null;');
  await fs.writeFile(filePath,html,'utf8');
  console.log(html===before?'No scorecard display changes matched.':'Patched scorecard display and Vendor Quality KPI.');
}
main().catch(err=>{console.error(err);process.exit(1);});
