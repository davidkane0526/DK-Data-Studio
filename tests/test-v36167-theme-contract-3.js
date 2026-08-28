'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));


const theme=read('src/core/theme/runtime.js');
const modern=readCoreCss(root);
const base=readCoreCss(root);
const manager=read('src/core/plugins/manager-ui.js');
const kernel=read('src/generated/runtime/plugin-kernel.js');
const desktopPackage=read('desktop/plugin-package.js');
const mobilePackage=read('src/core/host/mobile-plugin-package.js');
const validator=read('sdk/tools/dkds-plugin.js');
const apiTypes=read('sdk/plugin-api.d.ts');
const templateJson=json('sdk/templates/theme-profile/plugin.json');
const templateJs=read('sdk/templates/theme-profile/plugin.js');
const schema=json('sdk/plugin-manifest.schema.json');
const index=read('src/index.html');

assert(theme.includes("version:'3.8.0'"),'Theme Runtime must expose the strict Theme Contract 3.8 runtime.');
for(const key of ['motionFast','motionNormal','motionSlow','easeStandard','easeEmphasized','hoverLift','pressScale'])assert(theme.includes(key),`Theme Runtime motion token missing ${key}`);
for(const cssVar of ['--dkui-motion-fast','--dkui-motion-normal','--dkui-motion-slow','--dkui-ease-standard','--dkui-ease-emphasized','--dkui-hover-lift','--dkui-press-scale'])assert(modern.includes(cssVar),`Core motion CSS token missing ${cssVar}`);
assert(modern.includes('@media(prefers-reduced-motion:reduce)'),'Core Theme motion must respect reduced-motion.');
assert(!base.includes('.automation-test-note,.automation-test-log-path{padding:10px 12px;border-radius:9px;background:var(--surface-soft'),'Automation page must not use the undefined legacy --surface-soft token.');
assert(base.includes('.automation-test-note,.automation-test-log-path')&&base.includes('background:var(--surface-secondary,var(--surface-primary))'),'Automation note/log surfaces must use semantic theme surfaces.');
assert(/\.automation-test-row\.pass \.automation-test-status\s*\{[^}]*background:var\(--success-soft\)[^}]*color:var\(--success\)/.test(base),'Automation statuses must use semantic success tokens.');

const pluginTypes=schema.properties.pluginType.enum||[];
assert(pluginTypes.includes('theme'),'SDK manifest schema must expose pluginType=theme.');
for(const source of [kernel,desktopPackage,mobilePackage])assert(source.includes("'theme'"), 'Core/Desktop/Mobile plugin type routing must accept Theme plugins.');
assert(index.includes('<option value="theme">主题</option>'),'Plugin Manager type filter must expose Theme plugins.');
assert(manager.includes("theme:{label:'主题'")&&manager.includes('plugin-theme-profile-select')&&manager.includes('plugin-theme-activate-btn'),'Plugin Manager must provide a first-class Theme category and profile activation UI.');
assert(manager.includes('dkds:theme-profile-changed'),'Plugin Manager must refresh when a Theme profile changes.');

assert.equal(templateJson.pluginType,'theme','SDK theme template must be a real Theme plugin, not generic extension.');
assert.deepEqual(templateJson.requiresCore,['ui.theme']);
assert(templateJs.includes("pluginType:'theme'")&&templateJs.includes('motion:{')&&templateJs.includes("ctx.ui.theme.register('default'"),'SDK theme template must demonstrate profile + motion registration.');
assert(apiTypes.includes('DKDSThemeMotionSpec')&&apiTypes.includes('motion?:DKDSThemeMotionSpec'),'SDK types must expose bounded Theme motion authoring.');
assert(validator.includes("m.pluginType==='theme'")&&validator.includes('Theme plugins must register at least one profile'),'Standalone SDK validator must enforce Theme plugin semantics.');
assert(desktopPackage.includes("pluginType==='theme'")&&desktopPackage.includes('Theme plugins must declare ui.theme'),'Desktop package installer must enforce Theme plugin semantics.');
assert(validator.includes('Theme plugins must not ship arbitrary stylesheets'),'SDK validator must reject arbitrary Theme CSS.');
assert(desktopPackage.includes('Theme plugins must not ship arbitrary stylesheets'),'Desktop package validation must reject arbitrary Theme CSS.');

console.log('Theme Contract 3.8 plugin/runtime semantics checks passed.');
