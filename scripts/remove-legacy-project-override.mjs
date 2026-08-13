import fs from 'node:fs/promises';

const file = 'quick-summary.js';
const html = await fs.readFile(file, 'utf8');
const marker = '\n// Historical project creation-month view.';
const start = html.indexOf(marker);
if (start < 0) throw new Error('Legacy historical project override not found.');
const next = html.slice(0, start) + '\n';
await fs.writeFile(file, next, 'utf8');
console.log('Removed legacy 2025 project override; dashboard now uses monthlyActiveProjects.');
