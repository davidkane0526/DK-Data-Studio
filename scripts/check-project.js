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
  'src/core/data-model.js',
  'src/core/formula-engine.js',
  'src/core/parameter-schema.js',
  'src/core/workflow-engine.js',
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
  'scripts/test-data-center-core.js',
  'scripts/test-plugin-package.js',
  'scripts/package-plugin.js',
  'plugin-package.js',
  'src/plugins/data-center/plugin.json',
  'src/plugins/data-center/plugin.js',
  'mobile/App.tsx',
  'mobile/app.json',
  'mobile/package.json',
  'mobile/plugins/withDkdsWebAssets.js',
  'mobile/scripts/sync-web-assets.js',
  'mobile/README_ANDROID_CN.md',
  'DKDS.cmd',
  'DKDS_GUI.cmd',
  'tools/windows/dkds-tools.ps1',
  'tools/windows/dkds-gui.ps1',
  'sdk/README.md',
  'sdk/contract.json',
  'sdk/plugin-api.d.ts',
  'sdk/plugin-manifest.schema.json',
  'sdk/tools/dkds-plugin.js',
  'sdk/templates/workspace-plugin/plugin.json',
  'sdk/templates/workspace-plugin/plugin.js',
  'sdk/templates/algorithm-provider/plugin.json',
  'sdk/templates/algorithm-provider/plugin.js',
  'scripts/test-plugin-sdk-v357.js',
  'docs/ARCHITECTURE.md',
  'docs/PLUGIN_API.md',
  'docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md',
  'docs/ANDROID_PORTING.md',
  'docs/DATA_MODEL.md',
  'docs/WORKFLOW_RECIPES.md',
  'docs/PARAMETER_SCHEMA.md',
  'docs/FORMULA_ENGINE.md',
  'docs/WORKSPACE_PLUGIN_API.md',
  'docs/PLUGIN_PACKAGES.md',
  'docs/PROJECT_STRUCTURE.md',
  'docs/DEVELOPMENT_GUIDE.md',
  'docs/HANDOFF_NEXT_SESSION.md',
  'docs/guides/TOOLBOX_CN.md',
  'services/update-server/server.js',
  'services/update-server/publish-release.js',
  'config/update-config.default.json',
  'scripts/check-plugin-boundaries.js',
  'src/plugins/resonance-detector-robust/plugin.json',
  'src/plugins/resonance-detector-robust/plugin.js',
  'examples/external-plugins/resonance-detector-template/plugin.json',
  'examples/external-plugins/resonance-detector-template/plugin.js'
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    failed = true;
    console.error(`Missing required project file: ${rel}`);
  }
}

const allCmds = [];
(function collectCmds(dir){
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules' || name === 'dist' || name === 'android' || name === 'ios') continue;
    const full = path.join(dir,name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) collectCmds(full);
    else if (name.toLowerCase().endsWith('.cmd')) allCmds.push(path.relative(root,full).replace(/\\/g,'/'));
  }
})(root);
allCmds.sort();
const expectedCmds = ['DKDS.cmd','DKDS_GUI.cmd'];
if (JSON.stringify(allCmds) !== JSON.stringify(expectedCmds)) {
  failed = true;
  console.error(`CMD consolidation policy failed. Expected ${expectedCmds.join(', ')}; found ${allCmds.join(', ')}`);
}

if (failed) process.exit(2);
console.log(`Project check OK: ${jsFiles.length} JavaScript files + required architecture/docs/toolbox layout.`);
