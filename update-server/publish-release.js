const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SERVER_ROOT = path.resolve(__dirname);
const config = JSON.parse(fs.readFileSync(path.join(SERVER_ROOT, 'config.json'), 'utf8'));
const storageDir = path.resolve(SERVER_ROOT, config.storageDir || './storage');
const releasesDir = path.join(storageDir, 'releases');
const currentPath = path.join(storageDir, 'current.json');

const distArg = process.argv[2] || path.join(ROOT, 'dist');
const distDir = path.resolve(distArg);
const replace = process.argv.includes('--replace');

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(2);
}

if (!fs.existsSync(distDir)) fail(`dist directory not found: ${distDir}`);

const latestYmlPath = path.join(distDir, 'latest.yml');
if (!fs.existsSync(latestYmlPath)) {
  fail(`latest.yml not found in ${distDir}. Build the NSIS target first.`);
}

const latestText = fs.readFileSync(latestYmlPath, 'utf8');
const versionMatch = latestText.match(/^version:\s*["']?([^"' \r\n]+)["']?\s*$/m);
if (!versionMatch) fail('Unable to parse version from latest.yml');
const version = versionMatch[1];

const releasePath = path.join(releasesDir, version);
if (fs.existsSync(releasePath) && !replace) {
  fail(`release ${version} already exists. Publish a newer version, or use --replace only for a local test.`);
}

fs.mkdirSync(releasesDir, { recursive: true });
const tempPath = path.join(releasesDir, `.${version}.tmp-${process.pid}-${Date.now()}`);
fs.mkdirSync(tempPath, { recursive: true });

const candidates = fs.readdirSync(distDir).filter(name => {
  const lower = name.toLowerCase();
  return lower === 'latest.yml' ||
    lower.endsWith('.exe') ||
    lower.endsWith('.blockmap') ||
    lower.endsWith('.zip');
});

for (const name of candidates) {
  const src = path.join(distDir, name);
  if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(tempPath, name));
}

if (!fs.existsSync(path.join(tempPath, 'latest.yml'))) {
  fail('latest.yml was not copied to the temporary release directory.');
}

const publishedAt = new Date().toISOString();

if (replace && fs.existsSync(releasePath)) {
  fs.rmSync(releasePath, { recursive: true, force: true });
}
fs.renameSync(tempPath, releasePath);

const currentTemp = currentPath + `.tmp-${process.pid}`;
fs.mkdirSync(storageDir, { recursive: true });
fs.writeFileSync(currentTemp, JSON.stringify({
  schema: 2,
  mode: 'trusted-lan',
  version,
  publishedAt
}, null, 2) + '\n', 'utf8');
fs.renameSync(currentTemp, currentPath);

// Retain recent releases.
const retain = Math.max(2, Number(config.retainReleases) || 12);
const dirs = fs.readdirSync(releasesDir)
  .map(name => ({ name, full: path.join(releasesDir, name) }))
  .filter(x => !x.name.startsWith('.') && fs.statSync(x.full).isDirectory())
  .map(x => ({ ...x, mtime: fs.statSync(x.full).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

for (const item of dirs.slice(retain)) {
  if (item.name === version) continue;
  fs.rmSync(item.full, { recursive: true, force: true });
}

console.log('============================================================');
console.log(' Published LAN update (trusted-LAN mode)');
console.log('============================================================');
console.log(`Version     : ${version}`);
console.log(`Release dir : ${releasePath}`);
console.log(`Files       : ${candidates.length}`);
console.log('Keys        : NOT REQUIRED');
console.log('Integrity   : electron-updater latest.yml / SHA512');
console.log('');
console.log('If update-server/server.js is running, clients will receive');
console.log('a WebSocket push within ~1.5 seconds.');
console.log('============================================================');
