'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));


assert.equal(json('sdk/contract.json').sdkVersion,'1.18.0');
const theme=read('src/core/theme/runtime.js');
const types=read('sdk/plugin-api.d.ts');
const template=read('sdk/templates/theme-profile/plugin.js');
const materialCss=read('src/styles/theme/material-renderer.css');
const modernRoot=read('src/styles/presentation/shell.css');
const keys=['materialBlur','materialBlurStrong','materialSaturation','materialTintOpacity','specularHighlight','innerHighlight','glassEdge','materialNoiseOpacity'];
assert(theme.includes("version:'3.6.0'"),'Theme Runtime must expose 3.1.0.');
assert(theme.includes('const MATERIAL_KEYS='),'Theme Runtime must keep bounded material keys separate from motion.');
assert(theme.includes('ThemeContract.resolveProfile'),'Theme Runtime must resolve shared material profile values through the strict Theme Contract.');
for(const key of keys){assert(theme.includes(key),`Theme Runtime missing ${key}`);assert(types.includes(key),`SDK types missing ${key}`);assert(template.includes(key),`Theme template missing ${key}`);}
assert(types.includes('DKDSThemeMaterialSpec')&&types.includes('material?:DKDSThemeMaterialSpec'),'SDK must expose a typed material block.');
for(const cssVar of ['--dkui-material-blur','--dkui-material-blur-strong','--dkui-material-saturation','--dkui-material-tint-opacity','--dkui-specular-highlight','--dkui-inner-highlight','--dkui-glass-edge','--dkui-material-noise-opacity'])assert(modernRoot.includes(cssVar)||materialCss.includes(cssVar),`Core CSS missing ${cssVar}`);
assert(materialCss.includes('data-dkds-material-recipe=\"soft-glass\"')&&materialCss.includes('data-dkds-material-recipe=\"liquid-glass\"')&&materialCss.includes('background-image:radial-gradient'),'Core must own reusable material recipes including noise composition.');
assert(materialCss.includes('var(--dkui-material-blur)')&&materialCss.includes('var(--dkui-material-saturation)'),'Core material recipes must consume Theme material values.');
const roleCss=read('src/styles/theme/material-roles.css');const roleRuntime=read('src/core/theme/material-renderer.js');assert(roleCss.includes('[data-dkds-material-role="chrome"]')&&!roleCss.includes('.topbar'),'Material-role CSS must consume runtime semantics rather than remap concrete components.');assert(roleRuntime.includes('.topbar')&&roleRuntime.includes('.dkds-memory-panel'),'Core runtime must assign semantic roles before recipe rendering.');

// Execute the runtime with a minimal DOM to prove shared material values and
// mode-specific overrides are actually projected to public CSS variables.
const props=new Map();
const rootStyle={setProperty:(k,v)=>props.set(k,String(v)),removeProperty:k=>props.delete(k),colorScheme:''};
const sandbox={console,Map,Set,Object,String,Promise,CustomEvent:function(type,init){this.type=type;this.detail=init?.detail;},localStorage:{getItem:()=>'',setItem:()=>{}},document:{documentElement:{style:rootStyle,dataset:{}}},getComputedStyle:()=>({getPropertyValue:k=>props.get(k)||''}),matchMedia:()=>({matches:false}),addEventListener:()=>{},dispatchEvent:()=>{},window:null,globalThis:null};
sandbox.window=sandbox;sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(read('sdk/theme-contract.js'),sandbox,{filename:'theme-contract.js'});vm.runInContext(theme,sandbox,{filename:'theme-runtime.js'});
const handle=sandbox.DKDSTheme.registerProfile('test.material',{material:{materialBlur:'11px',materialBlurStrong:'19px',materialSaturation:'1.15',materialTintOpacity:'4%',specularHighlight:'rgba(255,255,255,.2)',innerHighlight:'rgba(255,255,255,.1)',glassEdge:'rgba(255,255,255,.16)',materialNoiseOpacity:'2%'},modes:{dark:{materialBlur:'15px'}}});
sandbox.DKDSTheme.setProfile('test.material',{persist:false,emit:false,broadcast:false});
assert.equal(props.get('--dkui-material-blur'),'11px');
assert.equal(props.get('--dkui-material-blur-strong'),'19px');
assert.equal(props.get('--dkui-material-tint-opacity'),'4%');
sandbox.DKDSTheme.set('dark');
assert.equal(props.get('--dkui-material-blur'),'15px','dark mode map must be able to override shared material values.');
handle.dispose();

console.log('v3.61.68 Theme Contract 3.1 material checks passed.');
