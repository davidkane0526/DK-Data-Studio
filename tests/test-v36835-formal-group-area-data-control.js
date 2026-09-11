'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const app=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo,sdk=json('sdk/contract.json');
assert.strictEqual(mobile.version,app.version);assert.strictEqual(expo.version,app.version);assert(expo.android.versionCode>=69);
assert.strictEqual(sdk.sdkVersion,'1.47.0');assert.strictEqual(sdk.minimumAppVersion,'3.68.103');

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

const resonance=read('src/plugins/resonance-workbench/feature-group-runtime.js'),ter=read('src/plugins/ter-analysis/feature-runtime.js');
assert(resonance.includes('wb.groupArea(hostEl')&&!resonance.includes('groupArea:true'),'Resonance must consume the formal GroupArea API, not the deprecated Grid flag.');
assert(ter.includes('workbench.groupArea(terGrid')&&!ter.includes('groupArea:true'),'TER must consume the same formal GroupArea API.');
for(const rel of ['src/plugins/resonance-workbench/plugin.json','src/plugins/ter-analysis/plugin.json'])assert(json(rel).requiresCore.includes('ui.group-area'),`${rel} must declare the public GroupArea runtime requirement.`);

const shellModel=read('mobile/src/model/shell-model.ts'),header=read('mobile/src/components/NativeHeader.tsx');
assert(shellModel.includes("filter(surface => surface.role === 'data-control')")&&!shellModel.includes("presentationPurpose || '').toLowerCase() === 'parameters'"),'参数 and 数据 must be one Mobile data-control mapping, not two purpose-specific abstractions.');
assert(header.includes('canonicalDataControlSurface(shell)')&&header.includes("{dataControlSurface.label || '参数'}"),'The fixed utility slot must display the plugin-provided label, e.g. 参数 or 数据.');
assert(header.indexOf("onAction('history-redo')")<header.indexOf('accessibilityLabel={dataControlSurface.label'),'Data-control must remain in the fixed utility position after undo/redo.');

const dcViews=read('src/plugins/data-center/shared-views.js'),dcMobile=read('src/plugins/data-center/mobile.css'),nativeCss=read('src/styles/platform/native-workspace-presentation.css');
assert(dcViews.includes('data-dkds-mobile-header-layout="row"'),'Data Center must explicitly request its compact title/action row.');
assert(dcMobile.includes('grid-template-columns:minmax(0,1fr) minmax(118px,150px)')&&dcMobile.includes('min-height:34px'),'Data object title and purpose filter must fit one compact row.');
assert(nativeCss.includes(':not([data-dkds-mobile-header-layout="row"])'),'Core narrow-drawer stacking must respect the generic keep-row semantic hint.');
assert((nativeCss.match(/min\(680px,58vh\)/g)||[]).length>=2,'Native scientific bottom companions must allow the higher 58vh maximum in both bottom-lane variants.');

console.log('v3.68.67 formal GroupArea + Mobile data-control/header/height contract PASS.');
