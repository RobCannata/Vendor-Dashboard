import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'dist', 'index.html');

function replaceAll(text, pairs) {
  let out = text;
  for (const [search, replacement] of pairs) {
    out = out.split(search).join(replacement);
  }
  return out;
}

async function main() {
  const html = await fs.readFile(FILE, 'utf8');
  const updated = replaceAll(html, [
    ['Customer charge', 'Customer invoice'],
    ['customerCharge', 'customerInvoice'],
    ['Customer charge less vendor invoice.', 'Customer invoice less vendor invoice.'],
    ['Customer charge = revenue • Vendor invoice = direct cost', 'Customer invoice = revenue • Vendor invoice = direct cost'],
    ['Customer charge is not captured yet; vendor invoice is still tracked.', 'Customer invoice is not captured yet; vendor invoice is still tracked.'],
    ['Add a customer charge field in ClickUp to show live revenue.', 'Add a customer invoice field in ClickUp to show live revenue.'],
    ['<h3>Service Revenue Generation</h3>', '<h3>Installation Margin</h3>'],
    ['<h3>P&L</h3>', '<h3>Installation Margin</h3>'],
    ['<h2>Service revenue generation</h2>', '<h2>Installation Margin</h2>'],
    ['<h2>P&L</h2>', '<h2>Installation Margin</h2>'],
    ['Modeled service revenue derived from recorded vendor cost and the selected target margin.', 'Installation margin derived from customer invoice and vendor invoice.'],
    ['Current filtered view at a ${Math.round(targetMargin)}% target gross margin.', 'Current filtered view at a ${Math.round(targetMargin)}% installation margin.'],
    ['<div class="main-kpi-value">' + '"' + ' + money(revenue, true) + ' + '"' + '<small>revenue</small></div>', '<div class="main-kpi-value">' + '"' + ' + money(profit, true) + ' + '"' + '<small>margin</small></div>'],
    ['<div class="main-kpi-sub">Gross profit ' + money(profit, true) + ' • margin ' + (margin == null ? "—" : margin + "%") + '</div>', '<div class="main-kpi-sub">Installation margin ' + (margin == null ? "—" : margin + "%") + ' • gross profit ' + money(profit, true) + '</div>'],
    ['Actual customer revenue not in tracker', 'Customer invoice not in tracker'],
    ['target gross margin', 'installation margin'],
    ['Revenue ', 'Customer invoice '],
  ]);

  if (updated !== html) {
    await fs.writeFile(FILE, updated, 'utf8');
    console.log('Patched dist/index.html for Installation Margin labels.');
  } else {
    console.log('No Installation Margin post-process changes needed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
