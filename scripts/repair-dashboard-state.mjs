import fs from 'node:fs/promises';

const financePath = 'finance.js';
const quickPath = 'quick-summary.js';

let finance = await fs.readFile(financePath, 'utf8');
let quick = await fs.readFile(quickPath, 'utf8');

finance = finance.replace(
  /function currentScoreSnapshot\(payload, periodValue\) \{[\s\S]*?\n\}\n\nfunction updateVendorScoreCards/s,
  `function currentScoreSnapshot(payload, periodValue) {\n  const endKey = periodKeys(periodValue).slice(-1)[0];\n  return { scores: payload?.scores || {}, projectScores: payload?.projectScores || {}, available: true, label: String(payload?.updatedAt || '').slice(0, 7) || endKey };\n}\n\nfunction updateVendorScoreCards`
);

finance = finance.replace(/if \(projectValue\) projectValue\.textContent = hasCurrentOps \? '12' : '—';/, "if (projectValue) projectValue.textContent = String(payload?.monthlyActiveProjects?.[endKey] ?? 0);");
finance = finance.replace(/if \(vendorValue\) vendorValue\.textContent = hasCurrentOps \? String\(Object\.keys\(scoreSnapshot\.scores \|\| \{\}\)\.length \|\| 5\) : '—';/, "if (vendorValue) vendorValue.textContent = String(Object.keys(payload?.scores || {}).length || 5);");
finance = finance.replace(/set\('execProjects', hasCurrentOps \? '12' : '—', hasCurrentOps \? `Current portfolio • \$\{label\}` : `No monthly project snapshot • \$\{label\}`\);/, "set('execProjects', String(payload?.monthlyActiveProjects?.[endKey] ?? 0), `${payload?.monthlyActiveProjects?.[endKey] ?? 0} projects created • ${label}`);");
finance = finance.replace(/set\('execVendors', hasCurrentOps \? String\(Object\.keys\(scoreSnapshot\.scores \|\| \{\}\)\.length \|\| 5\) : '—', hasCurrentOps \? `Current vendor partners • \$\{label\}` : `No monthly vendor snapshot • \$\{label\}`\);/, "set('execVendors', String(Object.keys(payload?.scores || {}).length || 5), 'Current vendor partners');");
finance = finance.replace(/quick\('quickProjects', hasCurrentOps \? '12' : '—', hasCurrentOps \? `Current portfolio • \$\{label\}` : `No monthly project snapshot • \$\{label\}`\);/, "quick('quickProjects', String(payload?.monthlyActiveProjects?.[endKey] ?? 0), `${payload?.monthlyActiveProjects?.[endKey] ?? 0} projects created • ${label}`);");
finance = finance.replace(/quick\('quickVendors', hasCurrentOps \? String\(Object\.keys\(scoreSnapshot\.scores \|\| \{\}\)\.length \|\| 5\) : '—', hasCurrentOps \? `Current vendor partners • \$\{label\}` : `No monthly vendor snapshot • \$\{label\}`\);/, "quick('quickVendors', String(Object.keys(payload?.scores || {}).length || 5), 'Current vendor partners');");
await fs.writeFile(financePath, finance, 'utf8');

// Remove any duplicate inline trend rendering from quick-summary. The stylesheet owns hiding the bars.
quick = quick.replace(/\n\s*\/\/ 2026 project creation-month view[\s\S]*?\n\}\)\(\);\s*$/s, '\n');
await fs.writeFile(quickPath, quick, 'utf8');

console.log('Dashboard state repair complete.');
