const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const jsFiles = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (name.endsWith('.js')) jsFiles.push(full);
  }
}
walk(root);

let failed = false;
for (const file of jsFiles) {
  const r = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) {
    failed = true;
    console.error(`Syntax failed: ${path.relative(root, file)}`);
    console.error(r.stderr);
  }
}

const required = [
  'src/core/plugin-kernel.js',
  'src/core/plugin-manager-ui.js',
  'src/core/platform.js',
  'src/plugins/plugin-index.generated.js',
  'src/science/common.js',
  'src/science/import.js',
  'src/science/peaks.js',
  'src/science/ter.js',
  'src/science/pulse.js',
  'src/science/identity.js',
  'src/science/physics.js',
  'src/science/gate.js',
  'scripts/verify-science-parity.js',
  'mobile/App.tsx',
  'mobile/app.json',
  'mobile/package.json',
  'mobile/plugins/withGrsWebAssets.js',
  'mobile/scripts/sync-web-assets.js',
  'mobile/README_ANDROID_CN.md',
  'BUILD_ANDROID_DEBUG.cmd',
  'RUN_ANDROID_DEVICE.cmd',
  'INSTALL_ANDROID_APK.cmd',
  'CHECK_ANDROID_ENV.cmd',
  'docs/ARCHITECTURE.md',
  'docs/PLUGIN_API.md',
  'docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md',
  'docs/ANDROID_PORTING.md'
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    failed = true;
    console.error(`Missing required project file: ${rel}`);
  }
}

if (failed) process.exit(2);
console.log(`Project check OK: ${jsFiles.length} JavaScript files + required architecture docs.`);
