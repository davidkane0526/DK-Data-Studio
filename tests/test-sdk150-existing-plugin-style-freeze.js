'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');const crypto=require('crypto');
function digest(root,{include=()=>true}={}){const files=[];function walk(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name),stat=fs.statSync(file);if(stat.isDirectory())walk(file);else if(include(path.relative(root,file).replace(/\\/g,'/')))files.push(file);}}walk(root);const hash=crypto.createHash('sha256');for(const file of files){hash.update(path.relative(root,file).replace(/\\/g,'/'));hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');}return {count:files.length,sha256:hash.digest('hex')};}
const nonMigrating=digest('src/plugins',{include:rel=>!rel.startsWith('ter-analysis/')&&!rel.startsWith('pulse-analysis/')&&!rel.startsWith('resonance-workbench/')&&!rel.startsWith('data-center/')&&!rel.startsWith('pulse-sampler-tool/')&&!rel.startsWith('transfer-vth-lab/')});
assert.deepStrictEqual(nonMigrating,{count:37,sha256:'8aea181dbfcd7b67572a9105d54b9ffe95c15767b359f1a3eb21c0b66b3c80d7'},'Active TER/Pulse/Resonance/Data Center/Pulse Sampler/Vth Unit migrations must not modify any unrelated built-in plugin asset.');
for(const [rel,expected] of [
  ['plugin.css','b56cb70582da3102ee4d057349715db8707762d8702f377b660ebb3c5632d7ee'],
  ['analysis-runtime.js','236fd11a5490ab7745585033935a428059d654c9874cd21803a04141f2713b3d'],
  ['vth-task.js','cc2230b56d9f0fad8f040d70dd50bc27b29585e4ec47c9cde9b1e65672246cb1']
]){
  const bytes=fs.readFileSync(`src/plugins/transfer-vth-lab/${rel}`);
  assert.strictEqual(crypto.createHash('sha256').update(bytes).digest('hex'),expected,`Vth ${rel} production numeric/presentation baseline must remain byte-identical while only the dependency-gated live-domain seam is introduced.`);
}


for(const [rel,expected] of [
  ['steady-state-task.js','1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5'],
  ['live-domain.js','a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56'],
  ['domain-adapter.js','a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac']
]){
  const bytes=fs.readFileSync(`src/plugins/pulse-sampler-tool/${rel}`);
  assert.strictEqual(crypto.createHash('sha256').update(bytes).digest('hex'),expected,`Pulse Sampler ${rel} production owner must remain byte-identical during presentation-only Unit cutover.`);
}
assert(!fs.existsSync('src/plugins/pulse-sampler-tool/plugin.css')&&!fs.existsSync('src/plugins/pulse-sampler-tool/mobile.css'),'Pulse Sampler legacy presentation CSS must be physically retired after accepted production Unit cutover.');
const pulseManifest=JSON.parse(fs.readFileSync('src/plugins/pulse-sampler-tool/plugin.json','utf8'));
assert.deepStrictEqual(pulseManifest.styles,[],'Pulse Sampler production Unit presentation must load no private CSS.');

const styles=digest('src/styles');
assert.strictEqual(styles.count,36,'Core style layer inventory must remain stable during presentation-only Unit migration work.');
// Whole-tree CSS hashes are intentionally not release gates: legitimate Core-owned
// platform fixes (for example native Mobile title suppression or drawer density)
// must be protected by semantic/runtime invariants instead of freezing unrelated bytes.
const nativeShell=fs.readFileSync('src/styles/platform/native-client-shell.css','utf8');
const nativeWorkspace=fs.readFileSync('src/styles/platform/native-workspace-presentation.css','utf8');
assert(nativeShell.includes('--dkds-mobile-scrollbar-size:3px')&&nativeShell.includes('.analysis-page .analysis-page-header{display:none}'),'Native Mobile shared shell must preserve thin scrollbars and host-owned plugin identity.');
assert(nativeWorkspace.includes('overscroll-behavior-y:auto'),'Native Mobile nested vertical scroll relay must remain active.');


const stableFileHashes={
  'src/plugins/data-center/controller.js':'8b63f932cd97c6657e03b671fd6239de82f162a9b7b0d08942cb9147575aff8f',
  'src/plugins/data-center/artifact-selection.js':'92ee60f53de971a91bdbdd07fb2fbe2bd159300eb19757172279946f4883f6a8',
  'src/plugins/data-center/command-runtime.js':'bb3a89ded0c2997ccba4a2b881910fb567addb7302c3a2e2a495a80fff81d795',
  'src/plugins/pulse-analysis/analysis-service.js':'4fc900e81126a9bcb05677fe1bc87551d530898bd36e085c446d489cd09996b8',
  'src/plugins/pulse-analysis/controller.js':'5d2dd4f5195611655d7614520f5617c7646b5ee5d6d2be2d1df33313ef366ab8',
  'src/plugins/pulse-analysis/pulse-analysis-task.js':'04c4c91a0eb3b02aa4db3e54a653577aaf4cfa09b8a05062ca0074d50ef74b7e',
  'src/plugins/pulse-analysis/task-core.js':'8f66db25228a3ad3e41b8ddb8f6e0c592f9a9a501bac296c72d85216caad73a7',
  'src/plugins/pulse-analysis/window-runtime.js':'eddb4088f4e2e442348b828c432dae44adb68a0074dc4c0d91db8407e6bf0861'
};
for(const [file,expected] of Object.entries(stableFileHashes)){const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');assert.strictEqual(actual,expected,`${file} domain/runtime owner must remain byte-frozen while presentation geometry ownership is repaired.`);}
const dcMobile=fs.readFileSync('src/plugins/data-center/mobile.css','utf8');
assert(dcMobile.includes('--dc-main-columns')&&dcMobile.includes('--dc-main-areas')&&dcMobile.includes('@container data-center-workspace (max-width:419px)'),'Data Center Mobile layout must be protected by responsive semantic contracts rather than a whole-file SHA freeze.');
const crossLayer=require('../tools/quality/unit-runtime-style-ownership').audit();
assert.strictEqual(crossLayer.violations.length,0,'Migrated production Unit presentation must be protected by semantic cross-layer ownership, not whole-file CSS hashes.');

const resonanceWiring=new Set(['plugin.js','plugin.json','view-components.js','unit-presentation.js','feature-group-runtime.js','feature-main-plot-runtime.js','plugin.css']);
const resonanceStable=digest('src/plugins/resonance-workbench',{include:rel=>!resonanceWiring.has(rel)});
assert.deepStrictEqual(resonanceStable,{count:16,sha256:'da57e713611efdae250e1ad1f5d6abfba570d3de18c87cc99d7d77a68243c7dd'},'Resonance production Unit reconstruction may change presentation/wiring adapters and the reviewed parameter Legend flow CSS, including the main ScientificCurveSurface attachment adapter; the v3.71.24 post-closure orchestration/domain/task baseline remains byte-frozen after this explicit rendering-lifecycle correction.');
for(const [rel,expected] of [['plugin.css','dfa8e25f1463431420432ea95a64a81351eb9195c7986885ba507d61b80363c5'],['mobile.css','853c639753657813d6e27a4c30e8d33320d869b0b5703b40b6797e15fed79ccf']]){
  const bytes=fs.readFileSync(`src/plugins/resonance-workbench/${rel}`);
  assert.strictEqual(crypto.createHash('sha256').update(bytes).digest('hex'),expected,`Resonance ${rel} must match the reviewed current presentation baseline during Unit reconstruction.`);
}

const presentationWiring=new Set(['plugin.js','plugin.json','feature-runtime.js','super-layout.js','shared-views.js','plugin.css','unit-presentation.js']);
const terStable=digest('src/plugins/ter-analysis',{include:rel=>!presentationWiring.has(rel)});
assert.deepStrictEqual(terStable,{count:9,sha256:'c8962a20c585fa16c41d00e472720ad7636b969ec1355c154607f1e78f8fb77e'},'TER production Unit cutover may change presentation/wiring only; domain service, controller, tasks and selection runtime remain byte-frozen.');
assert(!fs.existsSync('src/plugins/ter-analysis/shared-views.js')&&fs.existsSync('src/plugins/ter-analysis/plugin.css'),'Legacy TER DOM template stays deleted, while accepted geometry-only plugin.css is retained for source parity.');
const manifest=JSON.parse(fs.readFileSync('src/plugins/ter-analysis/plugin.json','utf8'));
assert.deepStrictEqual(manifest.styles,['plugin.css'],'TER source-parity cutover must load its accepted geometry-only stylesheet.');
const terCss=fs.readFileSync('src/plugins/ter-analysis/plugin.css','utf8');
assert.strictEqual(crypto.createHash('sha256').update(terCss).digest('hex'),'a601985b774667acb6c8d8fea9255db87537a46afe4bdecc2d07504ef7a1442b','TER source-detail geometry must remain byte-identical to the accepted baseline.');
assert(!/(?:^|[;{}]\s*)(?:background(?:-color)?|color|border(?:-[\w-]+)?|box-shadow|text-shadow|font(?:-family|-size|-weight)?)\s*:/mi.test(terCss),'TER plugin.css may own geometry only, never visual paint.');
assert(manifest.scripts.includes('unit-presentation.js')&&!manifest.scripts.includes('shared-views.js'),'TER manifest must load Unit presentation and must not retain the legacy template.');
assert((manifest.requiresCore||[]).includes('ui.unit-templates')&&(manifest.requiresCore||[]).includes('ui.table'),'TER production cutover must declare its Unit/Table dependencies.');
const entry=fs.readFileSync('src/plugins/ter-analysis/plugin.js','utf8'),adapter=fs.readFileSync('src/plugins/ter-analysis/domain-adapter.js','utf8');
assert(entry.split(/\r?\n/).length<40,'TER plugin.js must remain a thin composition entry after production cutover.');
assert((entry.match(/analysisService\.create/g)||[]).length===1&&(entry.match(/C\.create/g)||[]).length===1,'TER entry must still instantiate exactly one production analysis service and one controller.');
assert(adapter.includes("ctx.services.domain.provide('live'")&&!adapter.includes('analysisService.create'),'TER domain adapter must project the same production owner and never instantiate a second service.');
console.log('SDK 1.51 TER/Pulse/Resonance/Data Center source-parity migration freeze PASS');
