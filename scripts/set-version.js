const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const input = String(process.argv[2] || '').trim();

const packagePath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const current = String(pkg.version || '0.0.0');

function parseFull(value) {
  const m = value.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] || ''
  };
}

function resolveVersion(value, currentVersion) {
  const exact = parseFull(value);
  if (exact) return value;

  const short = value.match(/^(\d+)\.(\d+)$/);
  if (!short) return null;

  const major = Number(short[1]);
  const minor = Number(short[2]);
  const cur = parseFull(currentVersion);

  if (cur && cur.major === major && cur.minor === minor && !cur.prerelease) {
    return `${major}.${minor}.${cur.patch + 1}`;
  }

  return `${major}.${minor}.0`;
}

const version = resolveVersion(input, current);

if (!version) {
  console.error('Invalid version.');
  console.error('Use x.y.z for an exact version, e.g. 3.7.1.');
  console.error('Or use x.y to publish the next patch, e.g. 3.7.');
  process.exit(2);
}

const resolved = parseFull(version);
const previous = parseFull(current);

// BUILD_AND_PUBLISH is intended for a new release. Do not silently publish
// the same or an older stable version.
if (previous && resolved && !resolved.prerelease && !previous.prerelease) {
  const prevTuple = [previous.major, previous.minor, previous.patch];
  const nextTuple = [resolved.major, resolved.minor, resolved.patch];

  let cmp = 0;
  for (let i = 0; i < 3; i++) {
    if (nextTuple[i] !== prevTuple[i]) {
      cmp = nextTuple[i] > prevTuple[i] ? 1 : -1;
      break;
    }
  }

  if (cmp < 0) {
    console.error(`Refusing version rollback: current=${current}, requested=${version}`);
    console.error('The requested version is lower than the current source version.');
    process.exit(3);
  }
  if (cmp === 0) {
    console.log(`Rebuilding the current exact version ${version}.`);
  }
}

pkg.version = version;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const indexPath = path.join(root, 'src', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(
  /<span class="version">v[^<]+<\/span>/,
  `<span class="version">v${version}</span>`
);
fs.writeFileSync(indexPath, html, 'utf8');

// Keep every user-visible/runtime application version source synchronized.
// Built-in Resonance intentionally follows the application release version;
// other built-in plugins maintain their own semantic versions.
for (const relative of [
  path.join('src','app.js'),
  path.join('src','plugin-window','runtime.js'),
  path.join('src','plugins','resonance-workbench','plugin.js'),
  path.join('src','plugins','resonance-workbench','plugin.json')
]) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) continue;
  const before = fs.readFileSync(target, 'utf8');
  const after = before.split(current).join(version);
  if (after !== before) fs.writeFileSync(target, after, 'utf8');
}

console.log(`Current source version : ${current}`);
console.log(`Requested version      : ${input}`);
console.log(`Resolved release       : ${version}`);
console.log(`Application version set to ${version}`);
