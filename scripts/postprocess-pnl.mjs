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
    ['<h3>Service Revenue Generation</h3>', '<h3>P&L</h3>'],
    ['<h2>Service revenue generation</h2>', '<h2>P&L</h2>'],
    ['Actual customer revenue not in tracker', 'Customer invoice not in tracker'],
  ]);

  if (updated !== html) {
    await fs.writeFile(FILE, updated, 'utf8');
    console.log('Patched dist/index.html for customer invoice P&L labels.');
  } else {
    console.log('No P&L post-process changes needed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
