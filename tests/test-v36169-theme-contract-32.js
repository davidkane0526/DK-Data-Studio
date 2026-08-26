'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const assert=require('assert');
const vm=require('vm');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const Theme=require('../sdk/theme-contract');

assert.equal(json('package.json').version,'3.61.87');
assert.equal(json('sdk/contract.json').sdkVersion,'1.17.16');
assert.equal(Theme.version,'3.5.0');
assert(Theme.supports('contract.materialBlur')&&Theme.supports('material.roles.chrome')&&Theme.supports('platform.logical-units'));assert(!Theme.supports('materialBlur'));
for(const role of ['chrome','sidebar','surface','elevated','popover','control','floating'])assert(Theme.materialRoles().includes(role));

// Strict token and value validation.
assert.throws(()=>Theme.validateProfile({material:{materialBlurr:12}}),/unknown property "materialBlurr"/);
assert.throws(()=>Theme.validateProfile({material:{materialBlur:'banana'}}),/number or px\/dp length/);
assert.throws(()=>Theme.validateProfile({material:{materialTintOpacity:'900%'}}),/between 0 and 100/);
assert.throws(()=>Theme.validateProfile({motion:{motionFast:'forever'}}),/milliseconds/);
assert.throws(()=>Theme.validateProfile({motion:{pressScale:3}}),/between 0.8 and 1.2/);
assert.throws(()=>Theme.validateProfile({modes:{dark:{tokens:{notAThemeToken:'#fff'}}}}),/unknown property "notAThemeToken"/);

// Canonical mode precedence: shared < legacy flat < structured mode material < role.
const profile=Theme.validateProfile({
  material:{materialBlur:10,roles:{chrome:{materialBlur:12}}},
  modes:{dark:{materialBlur:13,material:{materialBlur:14,roles:{chrome:{materialBlur:18}}}}}
});
const dark=Theme.resolveProfile(profile,'dark');
assert.equal(dark.material.base.materialBlur,'14px');
assert.equal(dark.material.roles.chrome.materialBlur,'18px');
assert.equal(profile.material.base.materialBlur,'10px');
const nativeMaterial=Theme.projectMaterial(dark.material,'native');assert.equal(nativeMaterial.base.materialBlur,14);assert.equal(nativeMaterial.roles.chrome.materialBlur,18);

// Runtime capability is independent from Plugin API.
const props=new Map();const rootStyle={setProperty:(k,v)=>props.set(k,String(v)),removeProperty:k=>props.delete(k),colorScheme:''};
const sandbox={console,Map,Set,Object,String,Promise,CustomEvent:function(){},localStorage:{getItem:()=>'',setItem:()=>{}},document:{documentElement:{style:rootStyle,dataset:{}}},getComputedStyle:()=>({getPropertyValue:k=>props.get(k)||''}),matchMedia:()=>({matches:false}),addEventListener:()=>{},dispatchEvent:()=>{},window:null,globalThis:null};
sandbox.window=sandbox;sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(read('sdk/theme-contract.js'),sandbox);vm.runInContext(read('src/core/theme/runtime.js'),sandbox);
assert.equal(sandbox.DKDSTheme.contractVersion,'3.5.0');
assert.equal(sandbox.DKDSTheme.supports('contract.materialBlur'),true);assert.equal(sandbox.DKDSTheme.supports('materialBlur'),false);
assert.equal(sandbox.DKDSTheme.supports('material.roles.popover'),true);
assert.throws(()=>sandbox.DKDSTheme.registerProfile('bad-token',{material:{materialBlurr:12}}),/materialBlurr/);
assert.throws(()=>sandbox.DKDSTheme.registerProfile('bad-opacity',{material:{materialTintOpacity:'900%'}}),/between 0 and 100/);
const h=sandbox.DKDSTheme.registerProfile('contract32',{material:{materialBlur:11,roles:{chrome:{materialBlur:17}}},modes:{dark:{material:{materialTintOpacity:.08}}}});
sandbox.DKDSTheme.setProfile('contract32',{persist:false,emit:false,broadcast:false});
assert.equal(props.get('--dkui-material-blur'),'11px');
assert.equal(props.get('--dkui-material-chrome-blur'),'17px');
sandbox.DKDSTheme.set('dark');assert.equal(props.get('--dkui-material-tint-opacity'),'8%');h.dispose();

// Official template must pin app + theme contract compatibility.
const template=json('sdk/templates/theme-profile/plugin.json');
assert.equal(template.compatibility.app,'>=3.61.81 <4.0.0');
assert.equal(template.compatibility.themeContract,'^3.5.0');
const schema=json('sdk/plugin-manifest.schema.json');assert(schema.properties.compatibility.properties.themeContract);

// Standalone SDK validator must execute/register the profile and reject malformed data/ranges.
function tempTheme(mutator){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-theme32-'));fs.cpSync(path.join(root,'sdk/templates/theme-profile'),dir,{recursive:true});mutator?.(dir);return dir;}
function validateDir(dir){return cp.spawnSync(process.execPath,[path.join(root,'sdk/tools/dkds-plugin.js'),'validate',dir],{encoding:'utf8'});}
let dir=tempTheme(d=>{const p=path.join(d,'plugin.js');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('materialBlur:12','materialBlurr:12'));});let r=validateDir(dir);assert.notEqual(r.status,0);assert((r.stderr+r.stdout).includes('materialBlurr'));fs.rmSync(dir,{recursive:true,force:true});
dir=tempTheme(d=>{const p=path.join(d,'plugin.js');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('materialBlur:12',"materialBlur:'banana'"));});r=validateDir(dir);assert.notEqual(r.status,0);assert((r.stderr+r.stdout).includes('number or px/dp length'));fs.rmSync(dir,{recursive:true,force:true});
dir=tempTheme(d=>{const p=path.join(d,'plugin.json'),j=JSON.parse(fs.readFileSync(p,'utf8'));j.compatibility.app='definitely-not-a-semver-range';fs.writeFileSync(p,JSON.stringify(j,null,2));});r=validateDir(dir);assert.notEqual(r.status,0);assert((r.stderr+r.stdout).includes('valid semver range'));fs.rmSync(dir,{recursive:true,force:true});
dir=tempTheme(d=>{const p=path.join(d,'plugin.js');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('materialTintOpacity:.66',"materialTintOpacity:'900%'"));});r=validateDir(dir);assert.notEqual(r.status,0);assert((r.stderr+r.stdout).includes('between 0 and 100'));fs.rmSync(dir,{recursive:true,force:true});
dir=tempTheme(d=>{const p=path.join(d,'plugin.json'),j=JSON.parse(fs.readFileSync(p,'utf8'));j.compatibility.themeContract='definitely-not-a-semver-range';fs.writeFileSync(p,JSON.stringify(j,null,2));});r=validateDir(dir);assert.notEqual(r.status,0);assert((r.stderr+r.stdout).includes('valid semver range'));fs.rmSync(dir,{recursive:true,force:true});

const roleCss=read('src/styles/theme/material-roles.css');
for(const role of ['chrome','sidebar','surface','elevated','popover','control','floating'])assert(roleCss.includes(`material-${role}-blur`));
assert(roleCss.includes('base surface -> accent tint')||roleCss.includes('base surface'));
const gallery=read('src/core/theme/test-gallery.js');const manager=read('src/core/plugins/manager-ui.js');
assert(gallery.includes("data-gallery-mode=\"${mode}\"")&&gallery.includes('ScientificPlot')&&gallery.includes('Popover')&&gallery.includes('Floating'));
assert(manager.includes('plugin-theme-gallery-btn')&&manager.includes('DKDSThemeGallery'));
const docs=read('sdk/THEME_CONTRACT.md');assert(docs.includes('Material composition order')&&docs.includes('Web/Electron: 1 logical unit -> 1 CSS px')&&docs.includes('Theme Test Gallery'));
const kernel=read('src/generated/runtime/plugin-kernel.js');assert(kernel.includes('contractVersion: window.DKDSTheme')&&kernel.includes('supports: feature => window.DKDSTheme'));
const mobileHost=read('src/core/host/mobile-host-runtime.js');assert(mobileHost.includes('themeContractVersion:window.DKDSTheme')&&mobileHost.includes("themeMaterial:window.DKDSTheme?.materials?.('native')"),'Native shell bridge must receive Theme Contract version and normalized material roles.');
console.log('v3.61.69 Theme Contract 3.2 strict validation + material roles + gallery checks passed.');
