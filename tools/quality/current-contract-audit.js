#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const issues=[];
const PROJECT_GATEWAY='src/project-importers/compatibility-gateway.js';

function rel(file){return path.relative(ROOT,file).replace(/\\/g,'/');}
function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['generated','node_modules','dist','build','.git'].includes(entry.name))continue;
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())walk(file,out);else if(entry.isFile())out.push(file);
  }
  return out;
}
function text(file){try{return fs.readFileSync(file,'utf8');}catch{return '';}}
function add(file,message){issues.push(`${rel(file)}: ${message}`);}
function scanCode(file){
  const fileRel=rel(file);if(fileRel===PROJECT_GATEWAY)return;
  const source=text(file);
  const checks=[
    [/DKDSSemverCompat|semver-compat/i,'semver compatibility bridge is forbidden'],
    [/\bcompatibilityStatus\b/,'plugin compatibility status path is forbidden'],
    [/\bpluginHistoryList\b|\bpluginRollbackVersion\b|plugins:historyList|plugins:rollbackVersion/,'plugin package history/rollback compatibility path is forbidden'],
    [/\bctx\.ui\.(?:prime|sub)\b/,'retired ctx.ui.prime/sub facade is forbidden'],
    [/\bregister(?:Prime|Sub)Contribution\b/,'retired low-level PRIME/SUB contribution path is forbidden'],
    [/\brequestPlan\b|\bapplyPlan\b/,'retired AI planning alias is forbidden'],
    [/\bMIN_COMPATIBLE_CONTRACT_VERSION\b|\bminimumCompatibleContractVersion\b/,'Theme Contract version-range compatibility is forbidden'],
    [/\b(?:legacyMainWorkspaceShell|setLegacyWorkspaceVisible|showMainWorkspace|placePrimeContribution)\b/,'retired legacy workspace compatibility path is forbidden'],
    [/entry\s*\|\|\s*['"]plugin\.js['"]/,'plugin entry fallback is forbidden'],
    [/\bspec\.groupArea\s*===?\s*true\b/,'deprecated Grid groupArea flag is forbidden; use GroupArea'],
    [/\b(?:manifest|plugin|pkg|selection)\?*\.compatibility\b/,'runtime compatibility metadata access is forbidden'],
    [/plugin-history-btn|external\.history\b|external\.rollback\b/,'plugin package history/rollback UI path is forbidden'],
    [/built-in plugin override fallback/,'silent built-in override fallback is forbidden'],
    [/Invalid override must fall back|fallback to the bundled baseline/i,'invalid-override bundled fallback is forbidden'],
    [/\brequireExplicitUi\b/,'optional platform-presentation strictness switch is forbidden; current UI contract is always explicit'],
    [/\bobserveUnauthorizedRuntimeStyles\b|legacy\.observeUnauthorizedRuntimeStyles/,'retired Style Gate observer alias is forbidden'],
    [/terMaxByVg\s*\|\|\s*(?:result|r)\??\.terMax|terMax\s*:\s*terMaxByVg/,'TER result compatibility alias is forbidden outside the project migration gateway'],
  ];
  for(const [re,message] of checks)if(re.test(source))add(file,message);
  if(fileRel.startsWith('src/plugins/')&&/\.supports\s*\(\s*['\"]contract(?::|\.)/.test(source))add(file,'first-party plugins must target the exact current contract directly; contract capability probing is forbidden');
}
function scanManifest(file){
  let obj;try{obj=JSON.parse(text(file));}catch{return;}
  if(Object.prototype.hasOwnProperty.call(obj,'compatibility'))add(file,'root compatibility declaration is forbidden');
  if(Array.isArray(obj.pluginDependencies))for(const [i,row] of obj.pluginDependencies.entries()){
    if(!row||typeof row!=='object'||Array.isArray(row))continue;
    for(const key of Object.keys(row))if(key!=='id')add(file,`pluginDependencies[${i}].${key} is forbidden; dependencies are current-id only`);
  }
}

const codeRoots=['src','desktop','sdk','scripts','examples'];
for(const root of codeRoots)for(const file of walk(path.join(ROOT,root))){
  const fileRel=rel(file);
  if(fileRel.startsWith('sdk/templates/')&&fileRel.endsWith('/plugin.json'))scanManifest(file);
  if(fileRel.startsWith('examples/')&&fileRel.endsWith('/plugin.json'))scanManifest(file);
  if(fileRel.startsWith('src/plugins/')&&fileRel.endsWith('/plugin.json'))scanManifest(file);
  if(/\.(?:js|cjs|mjs|ts|tsx|json)$/.test(file)&&!fileRel.startsWith('src/project-importers/'))scanCode(file);
}

for(const forbidden of ['desktop/semver-compat.js','sdk/semver-compat.js'])if(fs.existsSync(path.join(ROOT,forbidden)))issues.push(`${forbidden}: compatibility module must not exist`);
const gateway=path.join(ROOT,PROJECT_GATEWAY);
if(!fs.existsSync(gateway))issues.push(`${PROJECT_GATEWAY}: historical project-file compatibility gateway must remain available`);
else{
  const source=text(gateway);
  for(const token of ['registerCompatibilityImporter','canonicalize','isHistorical'])if(!source.includes(token))issues.push(`${PROJECT_GATEWAY}: expected project migration boundary ${token} is missing`);
}

// Public authoring surfaces must not teach retired runtime contracts.
const authorDocs=['sdk/README.md','sdk/GROUP_AREA.md','sdk/GRID_LAYOUT.md','sdk/PLATFORM_PRESENTATION.md','sdk/THEME_CONTRACT.md','sdk/TOP_WORKSPACES.md','docs/PLUGIN_API.md','docs/PLUGIN_PACKAGES.md'];
const docChecks=[
  [/ctx\.ui\.prime\b|ctx\.ui\.sub\b/,'retired ctx.ui.prime/sub must not be documented as authoring API'],
  [/compatibility\.app|compatibility\.pluginApi|compatibility\.themeContract/,'manifest compatibility ranges must not be documented as current authoring API'],
  [/plugin-history|package-history|history rollback|rollback to|roll back|archived package/i,'package-version compatibility/history workflow must not be documented as current behavior'],
  [/groupArea\s*:\s*true/,'deprecated Grid groupArea flag must not be documented'],
  [/Runtime package normalization remains tolerant|interpreted as shared\/shared|Capability discovery continues to advertise supported contract versions|Legacy workspace `role` values remain valid/i,'authoring docs must not teach compatibility paths']
];
for(const fileRel of authorDocs){const file=path.join(ROOT,fileRel);if(!fs.existsSync(file))continue;const source=text(file);for(const [re,message] of docChecks)if(re.test(source))add(file,message);}

// Scientific parity fixtures are validation inputs for the current engine, not
// a second compatibility boundary. Historical project-state aliases belong only
// in the Project Compatibility Gateway and must not be normalized inside tests.
const parityFixture=path.join(ROOT,'tests/fixtures/science-baseline-v36158/src/science/ter.js');
if(fs.existsSync(parityFixture)&&/\bterMax\s*:\s*terMaxByVg\b/.test(text(parityFixture)))add(parityFixture,'retired TER result alias is forbidden in current scientific parity fixtures');
const parityVerifier=path.join(ROOT,'tests/verify-science-parity.js');
if(fs.existsSync(parityVerifier)&&/delete\s+baselineTer\.terMax\b/.test(text(parityVerifier)))add(parityVerifier,'test-side TER compatibility normalization is forbidden; fixtures must already use canonical current result fields');

if(issues.length){console.error(`Current contract audit FAILED (${issues.length})\n${issues.join('\n')}`);process.exit(1);}
console.log('Current contract audit PASS: obsolete compatibility layers=0; historical project-file migration boundary=1.');
module.exports=Object.freeze({validate:()=>({issues:[],obsoleteCompatibilityLayers:0,projectCompatibilityGateways:1})});
