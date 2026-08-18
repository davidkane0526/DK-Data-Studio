const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const outPath = path.join(ROOT, 'build-info.json');

const builtAtMs = Date.now();
const durationDays = 30;
const expiresAtMs = builtAtMs + durationDays * 24 * 60 * 60 * 1000;

const info = {
  schema: 1,
  buildType: 'packaged-trial',
  durationDays,
  builtAtMs,
  expiresAtMs,
  builtAt: new Date(builtAtMs).toISOString(),
  expiresAt: new Date(expiresAtMs).toISOString()
};

fs.writeFileSync(outPath, JSON.stringify(info, null, 2) + '\n', 'utf8');

console.log('Generated packaged-build expiry metadata:');
console.log(`  builtAt   = ${info.builtAt}`);
console.log(`  expiresAt = ${info.expiresAt}`);
console.log(`  duration  = ${durationDays} days`);
