const assert=require('assert');const fs=require('fs');
const main=fs.readFileSync('desktop/main.js','utf8'),pluginPackages=fs.readFileSync('desktop/main-modules/plugin-package-runtime.js','utf8'),preload=fs.readFileSync('desktop/preload.js','utf8'),kernel=fs.readFileSync('src/generated/runtime/plugin-kernel.js','utf8'),ui=fs.readFileSync('src/core/plugins/manager-ui.js','utf8');
assert(pluginPackages.includes("plugin-history")&&main.includes("plugins:historyList")&&main.includes("plugins:rollbackVersion"),'Main-process plugin history / rollback ownership is missing.');
assert(main.includes("archiveExternalPluginPackage(previousPackage,'upgrade')")&&main.includes("archiveExternalPluginPackage(previousPackage,'rollback')"),'Plugin upgrade/rollback IPC does not archive the previous package through the package runtime.');
assert(preload.includes('pluginHistoryList')&&preload.includes('pluginRollbackVersion'),'Preload does not expose plugin version history APIs.');
assert(kernel.includes('history:id=>')&&kernel.includes('rollback:rollbackExternalPlugin'),'Plugin Kernel does not expose version history/rollback to the manager UI.');
assert(ui.includes('plugin-history-btn')&&ui.includes('版本历史'),'Plugin Manager does not expose version-history rollback UI.');
console.log('External plugin version history v3.54 checks passed.');
