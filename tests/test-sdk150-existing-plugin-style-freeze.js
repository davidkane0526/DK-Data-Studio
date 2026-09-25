'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');const crypto=require('crypto');
function digest(root,{include=()=>true}={}){const files=[];function walk(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name),stat=fs.statSync(file);if(stat.isDirectory())walk(file);else if(include(path.relative(root,file).replace(/\\/g,'/')))files.push(file);}}walk(root);const hash=crypto.createHash('sha256');for(const file of files){hash.update(path.relative(root,file).replace(/\\/g,'/'));hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');}return {count:files.length,sha256:hash.digest('hex')};}
const blobSha=file=>{const bytes=fs.readFileSync(file),header=Buffer.from('blob '+bytes.length+'\x00');return crypto.createHash('sha1').update(header).update(bytes).digest('hex');};
const NON_MIGRATING_EXCLUDED=['ter-analysis/','pulse-analysis/','resonance-workbench/','data-center/','pulse-sampler-tool/','transfer-vth-lab/','_template/'];
const EXPECTED_NON_MIGRATING_BLOBS=Object.freeze({
  "aurora-pop-theme/plugin.js":"9a0a1f3197e1359bd46041cf53c18e2e7fd4894a",
  "aurora-pop-theme/plugin.json":"0ecbbd1123e46490f45e88da0679b4f38e64be43",
  "aurora-pop-theme/README.md":"f74e5d6a4d6df03a868130fc8c11900ecc250dd0",
  "connectivity-center/plugin.css":"a63b2cb1aa3a6b716b24c409919edbfcaa14f332",
  "connectivity-center/plugin.js":"20a63411dba6310c3fcdd5276b000934f8b2ba52",
  "connectivity-center/plugin.json":"4bfa151de5f0cc77b15006cb8cf42b2fbb6b3cc5",
  "flexible-import/plugin.js":"61018d5ff02369c88d51fb173c2f9fdd6516a7c2",
  "flexible-import/plugin.json":"d128231eb1658a28131e38b4124878aaf7d0024e",
  "flexible-import/README.md":"b9d55ca9df6569d4643d7b39e29008e20f75b023",
  "pulse-import/plugin.js":"e5953f9d370a0f17d10b44c963d6ca735d0868e4",
  "pulse-import/plugin.json":"18231bda3627a7757f0853334af5e2a06017579f",
  "README.md":"afd5ed4b956c3026bfa8d4a06259da88fc180f5f",
  "resonance-detector-robust/algorithm.js":"98d18528b2d6d97d096ad297eba7fd2f47833960",
  "resonance-detector-robust/plugin.js":"ceb2a2644c2499d09efa3ddab459a5ce65f2c33d",
  "resonance-detector-robust/plugin.json":"e7c8c74c5a3be1c64515960c2ed3575c9c693a2d",
  "resonance-detector-robust/README.md":"9dc6387e5d420f79f4fb182e69d84332732b0ae4",
  "resonance-detector-robust/resonance-task.js":"94f79edb55385ba85642c096f916025f6fc6565b",
  "resonance-detector-robust/task-core.js":"28844f21e28ade33058af49ad90b94bcf59ede88",
  "scientific-data-contracts/plugin.js":"abf2a77e970af586d66f8fa430678da5ad018b51",
  "scientific-data-contracts/plugin.json":"203b940f0c5aba28a799efc157d4a21f0f8a2b78",
  "shell-navigation/plugin.js":"0c97340330bcf8f59f57697211e139eb41c83106",
  "shell-navigation/plugin.json":"60713ad460c4aa8bbee9cf2824d496c803e63bce",
  "standard-transport-algorithms/algorithm.js":"05ce09d6551a31831487db1c8b0eb7ac90adb803",
  "standard-transport-algorithms/plugin.js":"33ec00d2c2906c7e2bb18fc828c02b9632dfb08b",
  "standard-transport-algorithms/plugin.json":"98e6cb5e7fac747f4dd25a34039b56ec2c3614ff",
  "standard-transport-algorithms/transport-task.js":"bef97a02028af5e9dffd764fdb4403aab30e9f7a",
  "status-monitor/plugin.js":"3c2f8c1eeaf4fe766723824b7841bbe5af660675",
  "status-monitor/plugin.json":"6f343ae58541f88a0c5fe59df51e7a4a40bf9acd",
  "status-monitor/theme-layout.js":"ffc71cd7445cfdbc32457035f2f96fddd8052625",
  "thin-glass-theme/plugin.js":"8465ddb48d7e062b598489f1a5d4eec493b0b34d",
  "thin-glass-theme/plugin.json":"e401b16c97901b28ec2c3aa10116b12b90140805",
  "thin-glass-theme/README.md":"390002676c04a6ef5c7c04aa9fc2dfd96a60040d",
  "workspace-safeguards/plugin.js":"83783d0f3360a67ce105d2ba08fa9ab47aee8fbf",
  "workspace-safeguards/plugin.json":"9aca3a1068d54dc50dbd57fc9e3b4fda46a3d3d8",
  "workspace-safeguards/README.md":"98420d99147d1a1c8b497ef288a8d4c4698ec886"
});
const currentNonMigrating=[];
(function walk(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name),stat=fs.statSync(file);if(stat.isDirectory())walk(file);else{const rel=path.relative('src/plugins',file).replace(/\\/g,'/');if(!NON_MIGRATING_EXCLUDED.some(prefix=>rel.startsWith(prefix)))currentNonMigrating.push(rel);}}})('src/plugins');
assert.deepStrictEqual(currentNonMigrating.sort(),Object.keys(EXPECTED_NON_MIGRATING_BLOBS).sort(),'Non-migrating built-in plugin inventory changed; SDK _template is intentionally excluded from the built-in byte freeze.');
for(const [rel,expected] of Object.entries(EXPECTED_NON_MIGRATING_BLOBS))assert.strictEqual(blobSha(path.join('src/plugins',rel)),expected,`Unrelated built-in plugin asset changed during Unit migration: ${rel}`);
assert(!fs.existsSync('src/plugins/transfer-vth-lab/plugin.css'),'Vth production private presentation CSS must remain physically retired after Unit cutover.');
const vthManifest=JSON.parse(fs.readFileSync('src/plugins/transfer-vth-lab/plugin.json','utf8'));
assert.deepStrictEqual(vthManifest.styles,[],'Vth production Unit presentation must load no private stylesheet.');
for(const [rel,expected] of [
  ['analysis-runtime.js','236fd11a5490ab7745585033935a428059d654c9874cd21803a04141f2713b3d'],
  ['vth-task.js','cc2230b56d9f0fad8f040d70dd50bc27b29585e4ec47c9cde9b1e65672246cb1']
]){
  const bytes=fs.readFileSync(`src/plugins/transfer-vth-lab/${rel}`);
  assert.strictEqual(crypto.createHash('sha256').update(bytes).digest('hex'),expected,`Vth ${rel} production numerical baseline must remain byte-identical during presentation lifecycle repair.`);
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
assert(dcMobile.includes('--dc-main-columns')&&dcMobile.includes('--dc-main-areas')&&!dcMobile.includes('@container data-center-workspace (max-width:419px)'),'Data Center Mobile layout must keep its semantic two-column tokens without a hard portrait collapse threshold.');
const crossLayer=require('../tools/quality/unit-runtime-style-ownership').audit();
assert.strictEqual(crossLayer.violations.length,0,'Migrated production Unit presentation must be protected by semantic cross-layer ownership, not whole-file CSS hashes.');
const cssDependency=require('../tools/quality/unit-production-css-dependency-audit').audit();
assert.strictEqual(cssDependency.ok,true,require('../tools/quality/unit-production-css-dependency-audit').format(cssDependency));

const resonanceWiring=new Set(['plugin.js','plugin.json','view-components.js','unit-presentation.js','feature-group-runtime.js','feature-main-plot-runtime.js','plugin.css','mobile.css']);
const EXPECTED_RESONANCE_STABLE_BLOBS=Object.freeze({
  'README.md':'5f67f4b6b91643ecf69d7daf53f2b61c5c0d82d3',
  'domain-adapter.js':'a8614d08612b6761866d1576e475153cd53b2a99',
  'feature-analysis-runtime.js':'eebd6ecab0824f55e130704ff7f26b17cbb70ae0',
  'feature-context.js':'d02ad9248ff7d0a628538048b4e1cb63a3ef9644',
  'feature-controls-runtime.js':'48c0da0227272a9a6f71ab18ccc0c2b1b4d1d95f',
  'feature-data-runtime.js':'f7c13abe007ac02cf84d068505c2d465b4d3649b',
  'feature-inspector-runtime.js':'454924b8dc34bb5d488b50eca02c479248111c54',
  'feature-peak-runtime.js':'2452b08fb29c2cd84ecfcfe1893aea7b99f7f42e',
  'feature-runtime.js':'5249e996b4125fdc81c52100f4e6e95292314513',
  'feature-selection-runtime.js':'bff05c01614dd7ca937f816c4a82bb91e9ebd5da',
  'feature-ter-runtime.js':'dc63f4d91ecea4205d97d1e4e03c2aa88fa11c2c',
  'inspector-detail-projection.js':'a3b288b3daea59b910ea2d057fa87d8c8347f39a',
  'main-marker-projection.js':'cdb04bbccb011de667b95e988bdfc29d88f861cc',
  'resonant-ter-task.js':'e83335ab6205a6bbcaeddc83fb15d028222605a3',
  'super-layout.js':'2d22d8df429844be0dd3e4b28f6c6d8562bfa29a',
  'task-core.js':'a0f5fc92d47cc896414f3497439a64f500eef36b',
  'window-runtime.js':'ca629f61617593c2414eac9e53fe50da4972a1a5',
  'workbench-shared.js':'60fab128a8f90edaa7e13e1ac27f637c489553b6'
});
const resonanceDir='src/plugins/resonance-workbench';
const resonanceStableFiles=fs.readdirSync(resonanceDir).filter(name=>fs.statSync(path.join(resonanceDir,name)).isFile()&&!resonanceWiring.has(name)).sort();
assert.deepStrictEqual(resonanceStableFiles,Object.keys(EXPECTED_RESONANCE_STABLE_BLOBS).sort(),'Resonance stable orchestration/domain/task inventory changed; presentation/mobile wiring is intentionally excluded and protected semantically.');
for(const [rel,expected] of Object.entries(EXPECTED_RESONANCE_STABLE_BLOBS))assert.strictEqual(blobSha(path.join(resonanceDir,rel)),expected,`Resonance stable orchestration/domain/task file changed unexpectedly: ${rel}`);
const resonanceDomainAdapter=fs.readFileSync('src/plugins/resonance-workbench/domain-adapter.js','utf8');
assert(resonanceDomainAdapter.includes("ctx.services.domain.provide('live'")&&!/createTop|createController/.test(resonanceDomainAdapter),'Resonance domain adapter must remain a projection seam over the single production owner.');
assert(resonanceDomainAdapter.includes('service.visibleSweepIds?.()')&&resonanceDomainAdapter.includes('visibleSweeps'),'Resonance adapter may expose visible sweeps only as a projection of the authoritative production visibility owner.');
assert(resonanceDomainAdapter.includes("require('builtin.resonance-workbench','main-marker-projection')")&&resonanceDomainAdapter.includes('mainMarkers'),'Resonance adapter must consume the shared marker projection owner rather than duplicate marker visibility rules.');
const resonanceCss=fs.readFileSync('src/plugins/resonance-workbench/plugin.css','utf8'),resonanceMobile=fs.readFileSync('src/plugins/resonance-workbench/mobile.css','utf8');
assert(!/\.respar-(?:scan-global|detect-actions)[^{]*\{[^}]*grid-template-columns/s.test(resonanceCss),'Resonance plugin CSS must not reclaim Unit-owned parameter ActionGrid density.');
assert(!/resonance-display-grid[^{]*\{[^}]*grid-template-columns/s.test(resonanceMobile),'Resonance Mobile CSS must not reclaim Unit-owned display FormGrid density.');

const presentationWiring=new Set(['plugin.js','plugin.json','feature-runtime.js','super-layout.js','shared-views.js','plugin.css','unit-presentation.js']);
const terStable=digest('src/plugins/ter-analysis',{include:rel=>!presentationWiring.has(rel)});
assert.deepStrictEqual(terStable,{count:9,sha256:'c8962a20c585fa16c41d00e472720ad7636b969ec1355c154607f1e78f8fb77e'},'TER production Unit cutover may change presentation/wiring only; domain service, controller, tasks and selection runtime remain byte-frozen.');
assert(!fs.existsSync('src/plugins/ter-analysis/shared-views.js')&&fs.existsSync('src/plugins/ter-analysis/plugin.css'),'Legacy TER DOM template stays deleted, while accepted geometry-only plugin.css is retained for source parity.');
const manifest=JSON.parse(fs.readFileSync('src/plugins/ter-analysis/plugin.json','utf8'));
assert.deepStrictEqual(manifest.styles,['plugin.css'],'TER source-parity cutover must load its accepted geometry-only stylesheet.');
const terCss=fs.readFileSync('src/plugins/ter-analysis/plugin.css','utf8');
assert(!/(?:^|[;{}]\s*)(?:background(?:-color)?|color|border(?:-[\w-]+)?|box-shadow|text-shadow|font(?:-family|-size|-weight)?)\s*:/mi.test(terCss),'TER plugin.css may own geometry only, never visual paint.');
assert(!/--dkds-(?:grid-(?:gap|align-items|auto-rows|columns)|plot-content-(?:flex|min-height|height))\s*:/.test(terCss),'TER plugin.css must not reclaim managed PlotGroup/PlotView geometry.');
assert(manifest.scripts.includes('unit-presentation.js')&&!manifest.scripts.includes('shared-views.js'),'TER manifest must load Unit presentation and must not retain the legacy template.');
assert((manifest.requiresCore||[]).includes('ui.unit-templates')&&(manifest.requiresCore||[]).includes('ui.table'),'TER production cutover must declare its Unit/Table dependencies.');
const entry=fs.readFileSync('src/plugins/ter-analysis/plugin.js','utf8'),adapter=fs.readFileSync('src/plugins/ter-analysis/domain-adapter.js','utf8');
assert(entry.split(/\r?\n/).length<40,'TER plugin.js must remain a thin composition entry after production cutover.');
assert((entry.match(/analysisService\.create/g)||[]).length===1&&(entry.match(/C\.create/g)||[]).length===1,'TER entry must still instantiate exactly one production analysis service and one controller.');
assert(adapter.includes("ctx.services.domain.provide('live'")&&!adapter.includes('analysisService.create'),'TER domain adapter must project the same production owner and never instantiate a second service.');
console.log('SDK 1.51 TER/Pulse/Resonance/Data Center source-parity migration freeze PASS');
