import fs from 'node:fs/promises';
const html = await fs.readFile('quick-summary.js', 'utf8');
if (html.includes('PROJECTS_2025')) throw new Error('Legacy 2025 project override still present');
if (!html.includes('2026 project creation-month view')) throw new Error('2026 project binding not present');
console.log('Project month binding verified: 2026-only source.');
