'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const Theme=require(path.join(root,'sdk/theme-contract.js'));

assert.equal(json('package.json').version,'3.61.97');
assert.equal(json('sdk/contract.json').sdkVersion,'1.17.16');
assert.equal(json('sdk/contract.json').themeContractVersion,'3.5.0');
assert.equal(Theme.version,'3.5.0');
assert(Theme.materialRecipes().includes('thin-glass'),'Theme Contract must expose thin-glass.');
assert.throws(()=>Theme.validateProfile({label:'bad',recipes:{popover:'custom-random-effect'},light:{},dark:{}},'bad-theme'),/recipe|custom-random-effect/i,'unknown recipe must be rejected');

const dts=read('sdk/plugin-api.d.ts');
assert(dts.includes("'clear'|'thin-glass'|'soft-glass'|'liquid-glass'"),'SDK recipe union must contain thin-glass.');
assert(dts.includes("thinGlass:boolean"),'renderer capability type must expose thinGlass.');

const renderer=read('src/core/theme/material-renderer.js');
for(const token of ["const VERSION='3.6.0'","'thin-glass'",'DKDSMaterialSurface','OPAQUE_PARENT_OCCLUSION','ROLE_MISSING','RECIPE_MISSING','BACKDROP_FILTER_NONE','renderer.thinGlass']) assert(renderer.includes(token),`renderer missing ${token}`);
assert(!/(?:\.respar-|\.ter-|\.pulse-|\.data-center)/.test(renderer.match(/const ROLE_BINDINGS=[\s\S]*?\]\);/)?.[0]||''),'Material role bindings must not know plugin identity.');
assert(renderer.includes("el.dataset.dkdsMaterialRoleClassOwner='material-surface'"),'MaterialSurface role ownership must be explicit.');
assert(renderer.includes("roleClassOwner==='core-runtime'"),'runtime inference must only remove runtime-owned role classes.');

const css=read('src/styles/theme/material-renderer.css');
const thin=css.match(/\[data-dkds-material-recipe="thin-glass"\][\s\S]*?\n\}/)?.[0]||'';
assert(thin,'independent thin-glass CSS recipe missing');
assert(/backdrop-filter:blur\(/.test(thin),'thin-glass must use backdrop-filter blur');
assert(/saturate\(/.test(thin),'thin-glass must use backdrop saturation');
assert(/filter:none/.test(thin),'thin-glass must explicitly avoid filter: blur on UI content');
assert(!/noise|specular|inner-highlight|optical|displacement|refraction|chromatic/i.test(thin.replace(/\/\*[\s\S]*?\*\//g,'')),'thin-glass recipe must not contain Liquid optical effects');
assert(!/\[data-dkds-material-recipe="thin-glass"\]::(?:before|after)/.test(css),'thin-glass must not use Liquid optical pseudo layers');

const runtime=read('src/core/theme/runtime.js');
assert(runtime.includes("profiles.set('builtin.thin-glass'"),'built-in Thin Glass profile missing');
for(const row of ["chrome:'thin-glass'","sidebar:'thin-glass'","surface:'clear'","elevated:'thin-glass'","popover:'thin-glass'","control:'clear'","floating:'thin-glass'"]) assert(runtime.includes(row),`Thin Glass policy missing ${row}`);
assert(!runtime.includes("metadata.family==='glass'"),'recipe policy must not infer glass from theme identity/metadata');
assert(!runtime.includes("const fallback={chrome:'clear'"),'Theme Runtime must not silently synthesize clear recipes for missing roles.');
assert(!runtime.includes("recipePolicy(profile.id,mode)[t.role]||'clear'"),'Theme setting reads must expose missing recipe rather than silently returning clear.');
assert(!renderer.includes('SAFE_DEFAULT_RECIPE_BY_ROLE'),'Material Renderer must not silently install all-clear recipe fallbacks.');
assert(!renderer.includes("return recipePolicy()[role]||'clear'"),'Material Renderer must expose RECIPE_MISSING rather than silently falling back to clear.');

const index=read('src/index.html');
for(const row of ['id="mainWorkspace" class="main-workspace dkds-material-role-surface"','id="statusBar" class="statusbar dkds-material-role-chrome"','id="pluginManagerPage"','dkds-material-role-elevated','id="automationTestPage"']) assert(index.includes(row),`Core static role coverage missing ${row}`);
assert(index.includes('core/theme/debug-runtime.js'),'Theme Debug runtime must be loaded in main shell.');
const pluginWindow=read('src/plugin-window/index.html');
assert(pluginWindow.includes('core/theme/debug-runtime.js'),'Theme Debug runtime must be loaded in Dedicated Workspace.');

const debug=read('src/core/theme/debug-runtime.js');
for(const row of ['component:','role:','recipe:','computed backdrop-filter:','opaque parent:']) assert(debug.includes(row),`Theme Debug missing ${row}`);
const coverage=read('src/core/theme/coverage-runtime.js');
for(const row of ['ROLE_MISSING','RECIPE_MISSING','BACKDROP_FILTER_NONE','OPAQUE_PARENT_OCCLUSION','ENGINE_UNSUPPORTED']) assert(coverage.includes(row),`Theme Coverage missing ${row}`);

const sdkTool=read('sdk/tools/dkds-plugin.js');
assert(sdkTool.includes("renderer.recipes.thin-glass"),'SDK validator Theme API must advertise thin-glass recipe support.');
assert(sdkTool.includes('must explicitly declare a Material Recipe for every Core role'),'SDK validator must reject incomplete Theme recipe policies instead of relying on renderer fallback.');
const template=json('sdk/templates/theme-profile/plugin.json');
assert.equal(template.compatibility.app,'>=3.61.81 <4.0.0');
assert.equal(template.compatibility.themeContract,'^3.5.0');
const templateJs=read('sdk/templates/theme-profile/plugin.js');
assert(templateJs.includes("popover:'thin-glass'")&&templateJs.includes("surface:'clear'"),'official Theme template must demonstrate Thin Glass policy.');

// Core material renderer is the only place allowed to paint real material surfaces.
for(const [file,selector] of [
  ['src/styles/foundation/foundation.css','.dkds-tooltip'],
  ['src/styles/structure/analysis-workbench.css','.dkds-settings-dialog'],
  ['src/styles/presentation/plugin-chrome.css','.dkds-settings-dialog']
]){
  const text=read(file);
  if(selector==='.dkds-tooltip') assert(!/\.dkds-tooltip[^\n]*backdrop-filter/i.test(text),`${file} still owns tooltip backdrop material`);
}

// First-party plugins may declare domain layout/data-semantic swatches, but material rendering is Core-only.
for(const dirent of fs.readdirSync(path.join(root,'src/plugins'),{withFileTypes:true})){
  if(!dirent.isDirectory()||dirent.name.startsWith('_')) continue;
  const folder=path.join(root,'src/plugins',dirent.name);
  for(const name of fs.readdirSync(folder)){
    if(!/\.(?:js|css)$/.test(name)) continue;
    const source=fs.readFileSync(path.join(folder,name),'utf8');
    assert(!/(?:-webkit-)?backdrop-filter\s*:/i.test(source),`first-party plugin ${dirent.name}/${name} must not own backdrop material rendering`);
    assert(!/filter\s*:\s*blur\(/i.test(source),`first-party plugin ${dirent.name}/${name} must never blur its own UI`);
  }
}

console.log('v3.61.75 Thin Glass MaterialSurface, role coverage, renderer and SDK contracts passed.');
