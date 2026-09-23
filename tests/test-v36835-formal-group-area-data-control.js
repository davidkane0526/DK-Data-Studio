'use strict';
const sdkAtLeast=(value,floor)=>{const a=String(value||'0.0.0').split('.').map(Number),b=String(floor||'0.0.0').split('.').map(Number);for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const app=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo,sdk=json('sdk/contract.json');
assert.strictEqual(mobile.version,app.version);assert.strictEqual(expo.version,app.version);assert(sdkAtLeast(app.version,'3.71.115'));assert(expo.android.versionCode>=255);
assert(sdkAtLeast(sdk.sdkVersion,'1.49.0'));assert(sdkAtLeast(sdk.minimumAppVersion,'3.70.6'));

const grid=read('src/core/ui/modules/grid/controller.js');
const scope=read('src/core/ui/modules/scope/plugin-scope.js');
const workbench=read('src/core/ui/modules/workbench/analysis.js');
const pluginApi=read('src/core/plugins/kernel/modules/plugin-api.js');
const contract=read('src/core/plugins/contract-runtime.js');
const sourceContract=read('sdk/source-contract.js');
const types=read('sdk/plugin-api.d.ts');
const docs=read('sdk/GROUP_AREA.md');
assert(grid.includes('class GroupAreaController extends GridController')&&grid.includes("get kind(){return 'group-area';}"),'Core must expose a concrete GroupAreaController without duplicating GridController layout machinery.');
assert(scope.includes('this.groupArea={create:')&&workbench.includes('groupArea(container,spec={})'),'Scoped UI and PluginWorkspace must both expose the formal GroupArea creator.');
assert(pluginApi.includes('groupArea: infrastructureScope?.groupArea || null')&&contract.includes("'ui.group-area':api=>!!api?.ui?.groupArea")&&sourceContract.includes("groupArea:'ui.group-area'"),'Plugin API runtime, requirement validation and static source audit must agree on ui.group-area.');
for(const token of ['DKDSGroupAreaSpec','DKDSGroupAreaController','DKDSGroupAreaRuntime','groupArea(container:Element|string'])assert(types.includes(token),`SDK types missing ${token}`);
for(const token of ['## Titles are optional','current scroll-region sticky','ctx.ui.groupArea.create','workbench.groupArea'])assert(docs.includes(token),`GroupArea authoring docs missing ${token}`);

const resonance=read('src/plugins/resonance-workbench/feature-group-runtime.js'),ter=read('src/plugins/ter-analysis/unit-presentation.js');
assert(resonance.includes('unitTemplates?.plotGroup')&&resonance.includes('.create(hostEl')&&!resonance.includes('groupArea:true'),'Resonance production presentation must consume the formal PlotGroup/GroupArea API through the Unit facade, not the deprecated Grid flag.');
assert(ter.includes('units.plotGroup.create(groupHost')&&!ter.includes('groupArea:true'),'TER production Unit presentation must consume the formal PlotGroup/GroupArea API through the public Unit facade.');
for(const rel of ['src/plugins/resonance-workbench/plugin.json','src/plugins/ter-analysis/plugin.json'])assert(json(rel).requiresCore.includes('ui.group-area'),`${rel} must declare the public GroupArea runtime requirement.`);

const shellModel=read('mobile/src/model/shell-model.ts'),header=read('mobile/src/components/NativeHeader.tsx');
assert(shellModel.includes("filter(surface => surface.role === 'data-control')")&&!shellModel.includes("presentationPurpose || '').toLowerCase() === 'parameters'"),'参数 and 数据 must be one Mobile data-control mapping, not two purpose-specific abstractions.');
assert(header.includes('canonicalDataControlSurface(shell)')&&header.includes("{dataControlSurface.label || '参数'}"),'The fixed utility slot must display the plugin-provided label, e.g. 参数 or 数据.');
assert(header.indexOf("onAction('history-redo')")<header.indexOf('accessibilityLabel={dataControlSurface.label'),'Data-control must remain in the fixed utility position after undo/redo.');

const dcViews=read('src/plugins/data-center/unit-presentation.js'),dcMobile=read('src/plugins/data-center/mobile.css'),nativeCss=read('src/styles/platform/native-workspace-presentation.css');
assert(dcViews.includes("dataset:{dkdsMobileHeaderLayout:'row'}"),'Data Center Unit presentation must explicitly request its compact title/action row through the generic semantic dataset hint.');
assert(dcMobile.includes('grid-template-columns:minmax(0,1fr) minmax(118px,150px)')&&dcMobile.includes('min-height:34px'),'Data object title and purpose filter must fit one compact row.');
const dcFilterLayouts=[...dcMobile.matchAll(/\.dc-filter-row\{([^}]*)\}/g)].map(match=>match[1]);
assert(dcFilterLayouts.length>0&&dcFilterLayouts.every(rule=>rule.includes('grid-template-columns:repeat(2,minmax(0,1fr))')),'Data Center hierarchy/field filters must remain one two-column row at every valid Mobile Drawer width.');
assert(nativeCss.includes(':not([data-dkds-mobile-header-layout="row"])'),'Core narrow-drawer stacking must respect the generic keep-row semantic hint.');
assert(!nativeCss.includes('--dkds-mobile-unit-bottom-min')&&!nativeCss.includes('--dkds-mobile-unit-bottom-preferred'),'GroupArea Unit block constraints must remain internal and must not own Mobile companion tracks.');
assert(nativeCss.includes('--dkds-mobile-bottom-track:var(--dkds-plugin-canvas-bottom-height,36%)'),'Every semantic bottom companion must consume the final Workspace SplitController track token without a second CSS geometry owner.');

console.log('v3.71.115 release/changelog baseline + formal GroupArea + Mobile data-control/filter/header/height contract PASS.');
