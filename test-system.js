#!/usr/bin/env node
const fs = require('fs');
const paths = [
  'system.json',
  'module/init.js',
  'templates/actors/character-sheet.html',
  'styles/custom-ttrpg.css',
  'lang/en.json'
];
let ok = true;
for (const p of paths) {
  const exists = fs.existsSync(p);
  console.log(`${exists ? '[OK ]' : '[ERR]'} ${p}`);
  if (!exists) ok = false;
}
console.log(ok ? 'Smoke check passed' : 'Smoke check failed');
process.exit(ok ? 0 : 1);
