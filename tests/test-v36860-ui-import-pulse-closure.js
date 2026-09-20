'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
assert(json('mobile/app.json').expo.android.versionCode>=87);

// 1. Handle: smaller visible geometry, same hit target/silhouette, theme-derived material.
const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
const shell=read('src/styles/presentation/shell.css');
const paint=read('src/styles/presentation/plugin-chrome.css');
assert(structure.includes('width:36px;height:36px'),'Resize hit target must remain 36×36.');
assert(structure.includes('width:18px;height:18px')&&structure.includes('width:15px;height:15px'),'Visible 28/25 silhouette must scale down coherently to 18/15.');
assert(structure.includes('clip-path:polygon(100% 0,100% 100%,0 100%)'),'Handle silhouette must remain the accepted clipped triangle.');
assert(paint.includes('--dkui-component-floating-chrome-indicator')&&paint.includes('--dkui-component-floating-chrome-border-active'),'Handle must consume theme-owned floatingChrome appearance.');
assert(!shell.includes('--dkui-portable-corner-'),'Shell must not hard-own PortableView handle colors.');
assert(!paint.includes('backdrop-filter'),'Accepted flat handle must not reintroduce blur.');

// 2. AI/MCP settings: status belongs to same action row and layout is overflow-safe.
const ai=read('src/plugins/connectivity-center/plugin.js');
const aiCss=read('src/plugins/connectivity-center/plugin.css');
assert(/dkaiMcpCopy[^<]*<\/button><span id="dkaiMcpState" class="dkai-mcp-state dkai-statusline/.test(ai),'MCP status must live in the action row instead of a separate line.');
assert(ai.includes('const line=lastMcp.running?`运行中${url?` · ${url}`'), 'MCP status must render as one compact line.');
assert(aiCss.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'AI two-column settings grid must allow children to shrink without overlap.');
assert(aiCss.includes('.dkai-field input,.dkai-field select{width:100%;min-width:0;box-sizing:border-box}'),'AI fields must be width-contained.');
assert(aiCss.includes('text-overflow:ellipsis;white-space:nowrap')&&aiCss.includes('max-width:min(46%,260px)'),'Long AI/MCP status text must remain bounded and ellipsized inside the dialog.');

// 3. Import dialog: default filter shows projects and data, JSON content is auto-classified, and JSON data has an actual provider.
const desktop=read('desktop/main.js');
const workbench=read('src/app/modules/import-workbench.js');
const web=read('src/web-bridge.js');
const flex=read('src/plugins/flexible-import/plugin.js');
const filterBlock=(desktop.match(/title: '选择数据 \/ 项目文件'[\s\S]*?filters: \[([\s\S]*?)\]\n\s*\}/)||[])[1]||'';
assert(filterBlock.indexOf("name: '项目 / 数据（自动识别）'")>=0,'Desktop import must default to the combined project/data filter.');
assert(filterBlock.indexOf("'json'")>=0&&filterBlock.indexOf("name: '项目 / 数据（自动识别）'")<filterBlock.indexOf("name: 'Data / Text'"),'JSON/project matching must be available in the first default filter.');
assert(workbench.includes("if(name.endsWith('.json'))")&&workbench.includes('DKDSProjectFormat?.isProjectLike?.(raw)'),'JSON must be classified by content before data import.');
assert(web.includes("accept:'.json,.csv,.txt,.dat,.tsv,.asc,.xy,.iv,.prn,.out,.log,application/json,text/*'"),'Web file picker must expose JSON alongside text data.');
assert(flex.includes("extensions:['json','csv','txt','dat','tsv','asc','xy','iv','prn','out','log']"),'Flexible importer must actually advertise every desktop data extension including non-project JSON.');
assert(flex.includes("['data','rows','records','points','values']")&&flex.includes("sourceContainer:normalized.jsonTabular?'json-tabular':'text'"),'Non-project JSON must have real tabular normalization/provenance, not be treated as arbitrary delimited text.');

// Execute the JSON adapter through the real science parser.
global.window=globalThis;
require(path.join(root,'src/science/common.js'));
require(path.join(root,'src/science/import.js'));
require(path.join(root,'src/core/project/format.js'));
let captured=null;
global.DKDSPlugins={define:(_manifest,activate)=>{captured={activate};}};
require(path.join(root,'src/plugins/flexible-import/plugin.js'));
let provider=null;
const ctx={science:global.DKDSScience,data:{model:{},importers:{register:(_id,row)=>{provider=row;}}}};
// Activate only registers provider; model helpers are not used by inspect/parse.
Promise.resolve(captured.activate(ctx)).then(()=>{
  assert(provider,'Flexible importer provider registration failed.');
  const file={name:'table.json',path:'table.json',text:JSON.stringify([{V:-1,I:1e-6},{V:0,I:2e-6},{V:1,I:3e-6}])};
  const ins=provider.inspect(file,provider.defaultOptions());
  assert(ins.rowCount===3&&ins.headers[0]==='V'&&ins.headers[1]==='I','Object-array JSON must normalize to a real numeric table.');
  const parsed=provider.parse(file,provider.defaultOptions());
  assert(parsed.datasets.length===1&&parsed.datasets[0].points.length===3,'Tabular JSON must parse through the same scientific dataset pipeline.');

  // 4/5. Pulse: one deterministic Mobile composition; result scope is a right-side titlebar action.
  const pulseView=read('src/plugins/pulse-analysis/unit-presentation.js');
  const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
  const pulseMobile=read('src/plugins/pulse-analysis/mobile.css');
  assert(pulseView.includes("actionsClassName:'pulse-compare-actions'")&&pulseView.includes("className:'pulse-scope-action'"),'Display-scope selector must be in the canonical Unit result-comparison header action cluster.');
  assert(!pulseView.includes("className:'pulse-compare-toolbar dkds-toolbar'"),'Result comparison must no longer be a standalone toolbar/body row.');
  assert(pulseCss.includes('.pulse-compare-actions{margin-left:auto;display:flex;align-items:center;justify-content:flex-end'),'Desktop display-scope control must align to the titlebar right side without redefining Core header geometry.');
  assert(pulseView.includes("variant:'two-card-grid'")&&pulseView.includes('responsiveTarget:primaryMain')&&!pulseView.includes('units.splitPane.create(primaryMain'),'Pulse results must use one Unit-owned projected-PRIMARY sequential composition path.');
  assert(pulseView.includes("gridTemplateColumns:'repeat(2,minmax(0,1fr))'"),'Wide projected PRIMARY lanes must keep the two scientific result cards side-by-side through Unit Layout geometry.');
  assert(pulseView.includes("maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}"),'Pulse may collapse to one result column only at the accepted Unit narrow-lane threshold.');
  assert(!pulseCss.includes('.pulse-results-split{')&&!pulseCss.includes('.pulse-results-grid{'),'Pulse plugin CSS must not remain a result-flow geometry owner after Unit cutover.');
  assert(!pulseMobile.includes('.pulse-results-split{')&&!pulseMobile.includes('.pulse-results-grid{'),'Mobile Pulse CSS must not re-declare Unit result flow geometry.');
  console.log('handle/theme + AI layout + import classification + Pulse mobile/header closure PASS.');
}).catch(err=>{console.error(err);process.exit(1);});
