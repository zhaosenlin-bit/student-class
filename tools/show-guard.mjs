import fs from 'node:fs';

const file = process.argv[2] || 'recon/scratch/dl-xb.html';
const h = fs.readFileSync(file, 'utf8');
const i = h.indexOf('returnMessage');
const start = h.lastIndexOf('<script', i);
console.log(h.slice(start, i + 120).slice(0, 5000));
