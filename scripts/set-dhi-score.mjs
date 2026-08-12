import fs from 'node:fs/promises';
import path from 'node:path';

const filePath = path.resolve(process.cwd(), 'dist', 'index.html');
const html = await fs.readFile(filePath, 'utf8');
const updated = html.replace(/const DHI_SCORE=(?:null|[-+]?\d+(?:\.\d+)?);/, 'const DHI_SCORE=92;');
if (updated === html) {
  throw new Error('DHI_SCORE declaration not found in dist/index.html');
}
await fs.writeFile(filePath, updated, 'utf8');
console.log('Set DHI_SCORE=92');
