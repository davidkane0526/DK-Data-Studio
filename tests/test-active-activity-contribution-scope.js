'use strict';
const assert=require('assert');const fs=require('fs');
const api=fs.readFileSync('src/core/plugins/kernel/modules/plugin-api.js','utf8'),shell=fs.readFileSync('src/core/plugins/kernel/modules/activity/shell.js','utf8');
assert(api.includes('scopedContributionSpec'));
assert(api.includes("scope==='global'")||api.includes("scope === 'global'"));
assert(api.includes('createToolbarButton(pluginId, scopedContributionSpec(spec))'));assert(api.includes('addMenuItem(pluginId,scopedContributionSpec(spec))'));
assert(/own\s*!==\s*String\(id\|\|''\)/.test(shell),'inactive/no-active contribution must hide');
console.log('Active activity contribution scope PASS');
