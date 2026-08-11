// Keep analytics cards aligned with the latest source template.
import fs from 'node:fs/promises';
import path from 'node:path';

const filePath = path.resolve(process.cwd(), 'dist', 'index.html');

const TREND_FROM = "const values=months.map(m=>({name:m.name,created:filtered.filter(d=>String(d.created||'').startsWith(m.key)).length,completed:filtered.filter(d=>String(d.done||'').startsWith(m.key)).length}));";
const TREND_TO = "const values=months.map(m=>({name:m.name,created:DATA.filter(d=>String(d.created||'').startsWith(m.key)).length,completed:DATA.filter(d=>String(d.done||'').startsWith(m.key)).length}));";

const TOP_FROM = "function renderTopCosts(){const items=filtered.filter(d=>d.invoiceRecorded&&d.invoice>0).sort((a,b)=>b.invoice-a.invoice).slice(0,7);renderBars('#topCostBars',items,x=>x.invoice,x=>x.name,n=>fmtMoney(n,true),['#9de05f','#4fc3f7','#9b8cff','#f6c85f','#5dd39e','#ff7a90','#5ea8ff'])}";
const TOP_TO = "function renderTopCosts(){const items=DATA.filter(d=>d.invoiceRecorded&&d.invoice>0).sort((a,b)=>b.invoice-a.invoice).slice(0,7);renderBars('#topCostBars',items,x=>x.invoice,x=>x.name,n=>fmtMoney(n,true),['#9de05f','#4fc3f7','#9b8cff','#f6c85f','#5dd39e','#ff7a90','#5ea8ff'])}";

async function main() {
  const html = await fs.readFile(filePath, 'utf8');
  let next = html;
  let replaced = 0;

  if (next.includes(TREND_FROM)) {
    next = next.replace(TREND_FROM, TREND_TO);
    replaced += 1;
  }

  if (next.includes(TOP_FROM)) {
    next = next.replace(TOP_FROM, TOP_TO);
    replaced += 1;
  }

  if (replaced === 0) {
    console.warn('No dashboard analytics strings were found to patch.');
  }

  await fs.writeFile(filePath, next, 'utf8');
  console.log(`Patched dashboard analytics (${replaced} replacements).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});