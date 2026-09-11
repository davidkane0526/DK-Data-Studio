const assert=require('assert');
const fs=require('fs');

const main=fs.readFileSync('desktop/main.js','utf8');
const pluginPackages=fs.readFileSync('desktop/main-modules/plugin-package-runtime.js','utf8');
const preload=fs.readFileSync('desktop/preload.js','utf8');
const kernel=fs.readFileSync('src/generated/runtime/plugin-kernel.js','utf8');
const ui=fs.readFileSync('src/core/plugins/manager-ui.js','utf8');

// SDK 1.33 / App 3.68.76 are current-contract-only. Package history is not a
// compatibility surface: upgrading replaces the current package directly.
for(const [name,source] of [
  ['desktop main',main],
  ['package runtime',pluginPackages],
  ['preload',preload],
  ['plugin kernel',kernel],
  ['plugin manager UI',ui]
]){
  assert(!/plugins:historyList|plugins:rollbackVersion|pluginHistoryList|pluginRollbackVersion|plugin-history-btn|版本历史/.test(source),`${name} must not expose retired package version history / rollback APIs.`);
}
assert(!pluginPackages.includes('plugin-history'),'Package runtime must not retain a plugin-history archive directory.');

// Installation remains transactional. This is not old-version compatibility:
// a failed write/load restores only the package that was current at the start
// of that same installation transaction.
assert(pluginPackages.includes('previousPackage')&&pluginPackages.includes('restoreInstalledPackage'),'Package runtime must retain same-transaction restore state for atomic install failure recovery.');
assert(main.includes('restoreInstalledPackage(manifest.id,pending.previousPackage||null)'),'Selected-package install must restore the pre-install package when the current install transaction fails.');
assert(main.includes('if(plan)restoreInstalledPackage(manifest.id,plan.previousPackage||null)'),'Generated-package install must restore the pre-install package when the current install transaction fails.');

console.log('Current plugin package replacement contract checks passed: no version history/rollback compatibility surface; same-transaction failure recovery retained.');
