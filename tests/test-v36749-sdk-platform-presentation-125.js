const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const PlatformPresentation=require('../sdk/platform-presentation-contract');
const {normalizePluginPackage,referencedPluginAssets}=require('../desktop/plugin-package');

const pkg=json('package.json');
const sdk=json('sdk/contract.json');
const mobilePkg=json('mobile/package.json');
const expo=json('mobile/app.json').expo;
const tuple=v=>String(v).split('.').map(Number);
const atLeast=(v,min)=>{const a=tuple(v),b=tuple(min);for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
assert(atLeast(pkg.version,'3.67.49'),'SDK 1.25 platform-presentation capability must remain available after v3.67.49.');
assert.strictEqual(sdk.sdkVersion,'1.47.0');
assert.strictEqual(sdk.pluginApiVersion,'1.19.0','SDK 1.25 must not fork Plugin API');
assert.strictEqual(sdk.minimumAppVersion,'3.68.103');
assert(atLeast(mobilePkg.version,'0.8.35'),'Mobile host must remain at or beyond the SDK 1.25 adoption baseline.');
assert(atLeast(expo.version,'0.8.35'),'Expo host must remain at or beyond the SDK 1.25 adoption baseline.');
assert(Number(expo.android.versionCode)>=46);
const mobileTestScript=String(pkg.scripts?.['mobile:test']||'');
assert(mobileTestScript.includes('npm run plugin:index'),'Clean-source mobile:test must regenerate the host-separated built-in plugin index before SDK 1.25 tests read it.');

assert.deepStrictEqual([...PlatformPresentation.modes],['shared','adaptive','custom']);
assert.deepStrictEqual([...PlatformPresentation.platforms],['desktop','mobile']);
const omitted={id:'com.example.omitted',pluginType:'workbench',styles:['plugin.css']};
assert.strictEqual(PlatformPresentation.validate(omitted).ok,false,'Current runtime must reject UI packages without explicit platform policy.');
assert.throws(()=>PlatformPresentation.policyFor(omitted,'desktop'),/must declare platformPresentation\.desktop/,'Asset selection must fail closed when a UI package omits the current platform contract.');
const nonUi={id:'com.example.algorithm',pluginType:'algorithm',scripts:['plugin.js']};
assert.strictEqual(PlatformPresentation.validate(nonUi).ok,true,'Non-UI plugins do not need a presentation policy.');
assert.strictEqual(PlatformPresentation.assetsFor(nonUi,'mobile').explicit,false,'Non-UI packages may omit presentation policy without creating a UI fallback.');
const custom={
  id:'com.example.custom',pluginType:'workbench',scripts:['plugin.js'],styles:['shared.css'],
  platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'custom',styles:['mobile.css'],scripts:['mobile-presentation.js']}}
};
assert.strictEqual(PlatformPresentation.validate(custom).ok,true);
assert.deepStrictEqual([...PlatformPresentation.assetsFor(custom,'desktop').platformStyles],[]);
assert.deepStrictEqual([...PlatformPresentation.assetsFor(custom,'mobile').platformStyles],['mobile.css']);
assert.deepStrictEqual([...PlatformPresentation.assetsFor(custom,'mobile').platformScripts],['mobile-presentation.js']);
assert.strictEqual(PlatformPresentation.validate({...custom,platformPresentation:{desktop:{mode:'custom',styles:['shared.css']},mobile:custom.platformPresentation.mobile}}).ok,false,'Shared/platform duplication must be rejected.');

const schema=json('sdk/plugin-manifest.schema.json');
assert(schema.properties.platformPresentation,'Manifest schema must publish platformPresentation.');
assert.deepStrictEqual(schema.properties.platformPresentation.required,['desktop','mobile']);
assert.deepStrictEqual(schema.$defs.platformPresentationPolicy.properties.mode.enum,['shared','adaptive','custom']);
assert.strictEqual(read('docs/plugin-manifest.schema.json'),read('sdk/plugin-manifest.schema.json'),'Docs and SDK schemas must stay identical.');

const coreCss=read('src/core.css');
const layerLine=coreCss.split(/\r?\n/).find(line=>line.includes('@layer'))||'';
assert(layerLine.indexOf('dkds.plugin')<layerLine.indexOf('dkds.plugin-platform'));
assert(layerLine.indexOf('dkds.plugin-platform')<layerLine.indexOf('dkds.structure'));

const panels=read('src/core/plugins/kernel/modules/pages/panels.js');
assert(panels.includes("requestedLayer==='dkds.plugin-platform'?'dkds.plugin-platform':'dkds.plugin'"),'Core style injector must bound platform layer selection.');
const runtime=read('src/core/plugins/kernel/modules/package-runtime.js');
assert(runtime.includes("declared==='mobile'?'mobile':'desktop'"),'Main renderer must select one active presentation host.');
assert(runtime.includes("{layer:'dkds.plugin-platform'}"),'Selected platform styles must use the dedicated platform layer.');
assert(runtime.includes("platformRows(row,'platformScripts',platform)"),'Built-in platform scripts must be host-selected.');
assert(runtime.includes("if(!contract?.assetsFor)throw new Error('DKDSPlatformPresentationContract is unavailable.')"),'Main renderer must fail closed when the current presentation contract is unavailable.');
assert(!runtime.includes("if(contract?.assetsFor)return"),'Main renderer must not retain an implicit shared/shared fallback.');
const mobilePackage=read('src/core/host/mobile-plugin-package.js');
assert(mobilePackage.includes("throw new Error('DKDSPlatformPresentationContract is unavailable.')"),'Mobile package normalization must require the current presentation contract.');
assert(mobilePackage.includes('presentationContract.validate(raw)'),'Mobile package normalization must use the same strict current contract.');
const contractRuntime=read('src/core/plugins/contract-runtime.js');
assert(contractRuntime.includes("errors.push('DKDSPlatformPresentationContract is unavailable.')"),'Core manifest validation must fail closed when the presentation contract is unavailable.');
const windowManager=read('desktop/plugin-window-manager.js');
assert(windowManager.includes("PlatformPresentation.assetsFor(manifest,'desktop')"),'Dedicated Electron windows must select Desktop presentation.');
const windowRuntime=read('src/plugin-window/runtime.js');
assert(windowRuntime.includes("'dkds.plugin-platform'"));
assert(windowRuntime.includes('spec.platformScripts'));
const packageScript=read('scripts/package-plugin.js');
assert(packageScript.includes('referencedPluginAssets(manifest)'),'CLI packager must delegate asset selection to the shared plugin-package contract.');
const packagedAssetProbe={entry:'plugin.js',scripts:['shared.js'],styles:['shared.css'],platformPresentation:{desktop:{mode:'custom',styles:['desktop.css'],scripts:['desktop.js']},mobile:{mode:'custom',styles:['mobile.css'],scripts:['mobile.js']}},tasks:[{id:'probe',entry:'task.js',imports:['task-core.js']}]};
const packagedAssets=new Set(referencedPluginAssets(packagedAssetProbe));
for(const file of ['plugin.js','shared.js','shared.css','desktop.css','desktop.js','mobile.css','mobile.js','task.js','task-core.js'])assert(packagedAssets.has(file),`Shared packager asset contract must include ${file}.`);

const omittedManifest={id:'com.example.omitted-ui',name:'Omitted UI',version:'1.0.0',apiVersion:'1.19.0',entry:'plugin.js',scripts:['plugin.js'],styles:['plugin.css'],pluginType:'extension',requiresCore:[]};
const omittedSource="DKDSPlugins.define({id:'com.example.omitted-ui',name:'Omitted UI',version:'1.0.0',apiVersion:'1.19.0',pluginType:'extension',requiresCore:[]},()=>({}));";
assert.throws(()=>normalizePluginPackage({schema:1,manifest:omittedManifest,files:{'plugin.js':omittedSource,'plugin.css':'.omitted{}'}}),/platformPresentation/,'Runtime package normalization must reject UI packages that omit the current platform contract.');

const customManifest={...omittedManifest,id:'com.example.platform-ui',name:'Platform UI',platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'custom',styles:['mobile.css'],scripts:['mobile-presentation.js']}}};
const normalized=normalizePluginPackage({schema:1,manifest:customManifest,files:{'plugin.js':omittedSource.replaceAll('com.example.omitted-ui','com.example.platform-ui').replaceAll('Omitted UI','Platform UI'),'plugin.css':'.shared{}','mobile.css':'.mobile{}','mobile-presentation.js':'globalThis.__platformPresenterLoaded=true;'}});
assert.deepStrictEqual(normalized.manifest.platformPresentation,customManifest.platformPresentation,'External package normalization must preserve platform policy.');

const generatedSource=read('src/generated/plugin-index.js');
const match=generatedSource.match(/window\.DKDS_BUILTIN_PLUGINS = ([\s\S]*?);\nwindow\.DKDS_BUILTIN_PLUGIN_ENTRIES/);
assert(match,'Generated plugin index must expose structured built-in rows.');
const rows=JSON.parse(match[1]);
for(const id of ['builtin.resonance-workbench','builtin.data-center','builtin.pulse-analysis','com.dkds.tools.pulse-sampler']){
  const row=rows.find(item=>item.id===id);assert(row,`Missing generated row ${id}`);
  assert(row.styleSources.every(item=>item.file!=='mobile.css'),`${id} must not load mobile.css as shared CSS.`);
  assert(row.platformStyleSources.mobile.some(item=>item.file==='mobile.css'),`${id} must carry mobile.css only in Mobile platform assets.`);
  assert.strictEqual(row.platformStyleSources.desktop.length,0,`${id} must not expose Mobile CSS to Desktop.`);
}

const pluginDirs=fs.readdirSync(path.join(root,'src','plugins')).filter(name=>!name.startsWith('_'));
for(const name of pluginDirs){
  const file=path.join(root,'src','plugins',name,'plugin.json');if(!fs.existsSync(file))continue;
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  const check=PlatformPresentation.validate(manifest);
  assert(check.ok,`${name}: ${check.errors.join(' ')}`);
  if(check.uiOwning){assert(manifest.platformPresentation?.desktop&&manifest.platformPresentation?.mobile,`${name} must declare both platform policies.`);}
}
for(const rel of ['sdk/templates/workspace-plugin/plugin.json','sdk/templates/top-workspace-plugin/plugin.json','sdk/templates/tool-plugin/plugin.json','examples/transfer-vth-lab/plugin.json']){
  const manifest=json(rel);assert(manifest.platformPresentation?.desktop&&manifest.platformPresentation?.mobile,`${rel} must teach explicit Desktop/Mobile responsibility.`);
}

const pluginSources=pluginDirs.map(name=>{const file=path.join(root,'src','plugins',name,'plugin.js');return fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';}).join('\n');
assert(!/ctx\.ui\.(?:desktop|mobile)\b/.test(pluginSources),'SDK 1.25 must not introduce parallel Desktop/Mobile Plugin APIs.');
assert(read('sdk/README.md').includes('Platform Presentation Authoring Contract (SDK 1.25)'));
assert(read('sdk/PLATFORM_PRESENTATION.md').includes('one domain/runtime implementation'));
assert(read('MOBILE_PRESENTATION_ARCHITECTURE.md').includes('SDK 1.25 platform-presentation contract'));
console.log('v3.67.49 SDK 1.25 platform presentation PASS: one Plugin API, explicit current host policies, fail-closed host-only assets, dedicated cascade layer, and first-party adoption.');
