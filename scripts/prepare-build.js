const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'generate-build-info.js')], {
  cwd: root,
  stdio: 'inherit'
});
if (result.status !== 0) process.exit(result.status || 1);

console.log('Build preparation complete: packaged 30-day metadata is ready. No update keys are required.');
