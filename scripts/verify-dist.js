const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function fail(msg) {
  console.error(`BUILD VALIDATION FAILED: ${msg}`);
  process.exit(2);
}

if (!fs.existsSync(dist)) fail('dist directory does not exist');

const names = fs.readdirSync(dist);
const latest = names.find(n => n.toLowerCase() === 'latest.yml');
const setup = names.find(n => n.toLowerCase().endsWith('.exe') && n.toLowerCase().includes('setup'));
const portable = names.find(n => n.toLowerCase().endsWith('.exe') && n.toLowerCase().includes('portable'));
const unpacked = path.join(dist, 'win-unpacked');

if (!latest) fail('latest.yml was not generated; LAN auto-update cannot be published');
if (!setup) fail('NSIS Setup EXE was not generated; LAN auto-update needs the installer payload');
if (!portable) fail('Portable EXE was not generated; Windows artifact bundle requires it');
if (!fs.existsSync(unpacked) || !fs.statSync(unpacked).isDirectory()) {
  fail('win-unpacked directory was not generated');
}

const latestText = fs.readFileSync(path.join(dist, latest), 'utf8');
const versionMatch = latestText.match(/^version:\s*["']?([^"' \r\n]+)["']?\s*$/m);
if (!versionMatch) fail('cannot parse version from latest.yml');
if (versionMatch[1] !== pkg.version) {
  fail(`latest.yml version ${versionMatch[1]} does not match package.json ${pkg.version}`);
}

if (!fs.existsSync(path.join(root, 'build-info.json'))) fail('build-info.json missing');

console.log('Build validation passed.');
console.log(`  version : ${pkg.version}`);
console.log(`  latest  : ${latest}`);
console.log(`  setup   : ${setup}`);
console.log(`  portable: ${portable}`);
console.log(`  unpacked: ${unpacked}`);
