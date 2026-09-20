'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const mobilePkg=json('mobile/package.json');
const expo=json('mobile/app.json').expo;
const [major,minor,patch]=String(pkg.version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=27))),'Mobile shell density/overflow contract requires v3.67.27+.');
assert(mobilePkg.version===require('../package.json').version||/^0\.8\.(?:18|1[9]|[2-9]\d|\d{3,})$/.test(String(mobilePkg.version||'')),'Mobile package must retain the 0.8.18+ baseline or use the synchronized app version.');
assert.strictEqual(expo.version,mobilePkg.version,'Expo/mobile versions must stay synchronized.');
assert(Number(expo.android.versionCode)>=29,'Android versionCode must be 29+.');

const app=read('mobile/App.tsx');
const header=read('mobile/src/components/NativeHeader.tsx');
const status=read('mobile/src/components/NativeStatusBar.tsx');
const overflow=read('mobile/src/model/overflow-layout.ts');
const types=read('mobile/src/model/shell-types.ts');
const sheets=read('mobile/src/sheets/ShellActionSheet.tsx');
const styles=read('mobile/src/styles/shell-styles.ts');
const statusMonitor=read('src/plugins/status-monitor/plugin.js');
const statusThemeLayout=read('src/plugins/status-monitor/theme-layout.js');
const statusCss=read('src/styles/structure/sdk-semantic-surfaces.css');
const nativeCss=read('src/styles/platform/native-client-shell.css');
const workspaceCss=read('src/styles/platform/native-workspace-presentation.css');
const chartRuntime=read('src/core/scientific/chart-runtime.js');
const curveNav=read('src/core/ui/modules/scientific-curve/navigation.js');
const resonancePlugin=read('src/plugins/resonance-workbench/plugin.js');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const pulse=read('src/plugins/pulse-sampler-tool/plugin.js');
const pulseUnit=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const dataCenter=read('src/plugins/data-center/unit-presentation.js');
const dataCenterCss=read('src/plugins/data-center/plugin.css');

assert(app.includes('<NativeHeader')&&app.includes('<NativeStatusBar')&&!app.includes('<BottomNavigation')&&!app.includes('<NavigationRail'),'The redundant global icon navigation row must be removed while the desktop-style bottom status bar remains.');
assert(app.includes('pluginOverflowKeys')&&app.includes('statusOverflowItems'),'Native App must retain explicit overflow state for top plugin commands and bottom status items.');

for(const token of ["{ id: 'import-sheet', label: '导入' }","{ id: 'data', label: '数据' }","{ id: 'activities', label: '分析' }","{ id: 'home', label: '工作区' }"])
  assert(header.includes(token),`Global text action missing from top command region: ${token}`);
assert(!header.includes('SystemGlyph')&&!styles.includes('systemGlyphCanvas'),'Native top-level commands must stay as theme-colored text buttons instead of custom black glyph drawings.');
assert((header.match(/headerDivider/g)||[]).length>=2&&header.indexOf('projectTabGroup')<header.indexOf('globalButtonGroup')&&header.indexOf('globalButtonGroup')<header.indexOf('pluginPackingArea'),'Project controls must be separated from ordered global text commands, which must in turn be separated from plugin-only packing.');
assert(header.includes('onLayout={event => setPluginAreaWidth')&&header.includes('packOrderedControls')&&header.includes('pluginMeasureLayer'),'Top plugin overflow must use measured pixel width rather than breakpoint/fixed-count heuristics.');
assert(!header.includes('directLimit')&&!/width\s*[<>]=?\s*(?:820|1024|1280)/.test(header),'Top plugin overflow must not regress to fixed viewport button counts.');
assert(header.includes('canonicalDataControlSurface(shell)')&&header.indexOf("onAction('history-redo')")<header.indexOf('accessibilityLabel={dataControlSurface.label'),'Exactly one semantic data-control surface must be promoted into the fixed utility slot to the right of undo/redo.');
assert(header.includes(">{dataControlSurface.label || '参数'}</Text>"),'Generated data-control button must preserve the plugin-provided label, allowing the same abstraction to read 参数 or 数据.');
assert(header.includes("dark ? '#ffffff'")&&header.includes('selectedTextColor'),'Top command text must remain white in dark themes, including selected buttons.');
assert(styles.includes('header: {')&&styles.includes('minHeight: 40')&&styles.includes('projectAction: { height: 30'),'Native top command chrome must remain shorter than the previous oversized row.');
assert(styles.includes('pluginPackingArea: { flex: 1, minWidth: 30'),'Top plugin slot must reserve enough width for its own overflow ellipsis even after project/global/history controls claim their fixed chrome.');

assert(overflow.includes('Only trailing plugin controls overflow')&&overflow.includes('available')&&overflow.includes('overflowWidth'),'Plugin control packing must reserve an overflow affordance inside the measured slot.');
assert(overflow.includes('lowest-preservation item is folded first')&&overflow.includes('DevTool folds')&&overflow.includes('AI folds last'),'Bottom status overflow algorithm must encode preservation priority, not visual-order removal.');
assert(overflow.includes('sort((a, b) => a.priority - b.priority')&&overflow.includes('remaining.delete(row.key)'),'Bottom status controls must be removed lowest-priority-first from the complete visible set.');

for(const [needle,value] of [["/\\bai\\b|agent|dkai/.test(key)) return",600],["/smb/.test(key)) return",500],["/lan-web|网页服务|web/.test(key)) return",400],["/theme|主题/.test(key)) return",300],["/memory|内存/.test(key)) return",200],["/devtool|devtools/.test(key)) return",100]])
  assert(status.includes(`${needle} ${value}`),`Bottom preservation priority missing: ${needle} ${value}`);
assert(status.includes('StatusTicker')&&status.includes("scrollEnabled={false}")&&status.includes('scrollTo')&&status.includes('setInterval'),'Bottom informational text must stay visible and auto-scroll when the available width is insufficient.');
assert(status.includes("onSheet('status-overflow')")&&types.includes("'status-overflow'"),'Bottom status overflow must expose a dedicated ellipsis sheet.');
assert(statusMonitor.includes("hidden:ctx.runtime.isWebClient")&&!statusMonitor.includes('isWebClient||ctx.runtime.isNativeClient'),'DevTool must remain a mobile status item so it can be the first canonical item folded when space contracts.');

assert(!types.includes("'more'")&&!sheets.includes("label=\"插件管理\"")&&!sheets.includes("label=\"局域网网页版\""),'The obsolete global More sheet must stay removed; Plugin Management and web service must not be duplicated there.');
assert(sheets.includes('analysisActivities')&&sheets.includes("key.includes('data-center')")&&!sheets.includes('当前工作区页面与面板'),'Analysis sheet must omit standalone Data Center and duplicated current-workspace surface listings.');
assert(sheets.includes('pluginOverflowSet')&&sheets.includes('overflowSurfaces')&&sheets.includes('overflowActions'),'Top ellipsis sheet must contain only plugin commands that actually overflowed.');

assert(!statusMonitor.includes('dkdsThemePluginSettingsBtn')&&header.includes("{ id: 'plugins', label: '插件' }")&&header.includes("else if (id === 'plugins') onAction('plugins');")&&!types.includes("'plugins'")&&!sheets.includes("visible === 'plugins'"),'Plugin Management must remain a first-level text command that opens only the canonical Plugin Manager, without a mixed Plugins sheet.');
assert(statusMonitor.includes('themeAnchor')&&statusMonitor.includes('anchorRect')&&statusMonitor.includes('ThemeLayout.positionThemePanel')&&statusThemeLayout.includes('center-box.width/2'),'Theme popover must keep the presented Theme status-button anchor bridge while the unique theme-layout owner performs centered/clamped geometry.');
assert(statusCss.includes('.dkds-theme-panel-head-actions')&&!statusMonitor.includes('dkdsThemePluginSettingsBtn'),'Theme header must retain close chrome while Plugin Management settings stay outside Theme UI.');

assert(pulseUnit.includes("presentationRole:'data-control'")&&pulseUnit.includes("label:'参数'")&&pulseUnit.includes("variant:'form-grid-2'")&&pulseUnit.includes("variant:'action-grid-4'"),'Pulse Designer must publish one platform-neutral Unit parameter PRIME whose content adapts through accepted Unit recipes rather than Mobile-specific layout patches.');
assert(workspaceCss.includes('data-dkds-mobile-region="drawer"')&&workspaceCss.includes('max-width:calc(100vw - 12px)')&&!workspaceCss.includes('@keyframes dkds-native-drawer-in'),'Mobile Parameters must remain a stable semantic drawer whose first-open width is solved from live Unit content rather than a historical fixed cap, with no replayed slide animation.');

for(const src of [chartRuntime,curveNav]){
  assert(src.includes('is-touch-visible')&&src.includes('is-dragging'),'Scientific floating toolbar must expose transient touch visibility and dragging states.');
  assert(src.includes('getCoalescedEvents')&&src.includes('requestAnimationFrame'),'Scientific toolbar drag must coalesce pointer events and update on animation frames for touch-following motion.');
}
assert(/html\[data-dkds-host="mobile"\]\.react-native-client \.dkds-scientific-nav-tools\{[^}]*opacity:0;pointer-events:none/.test(nativeCss)&&nativeCss.includes('.is-touch-visible'),'Scientific floating toolbar must auto-hide only in the native-client platform scope while retaining its Mobile touch geometry slots.');
assert(nativeCss.includes('html[data-dkds-host="mobile"].react-native-client')&&!nativeCss.includes('#resonanceDedicatedPage'),'Mobile Core platform styles must remain domain blind and must not pollute Desktop/plugin styling.');

assert(workspaceCss.includes('companion-right')&&workspaceCss.includes('border-radius:10px')&&workspaceCss.includes('companion-bottom'),'Mobile curve inspector and group companion title containers must retain rounded geometry.');
assert(!/#resonanceDedicatedPage \.reswin-group-grid\{[^}]*grid-template-columns/s.test(resonanceCss)&&read('src/plugins/resonance-workbench/feature-group-runtime.js').includes('factory.create(hostEl')&&read('src/plugins/resonance-workbench/feature-group-runtime.js').includes("orientationPolicy:{mode:'portrait-offset',offset:-1,minColumns:1}")&&resonanceCss.includes('.reswin-group-card{min-width:0'),'Group plots must let Core reduce effective columns before cards can overlap, while plugin cards remain width-flexible.');
assert(resonancePlugin.includes("side:'left'")&&resonancePlugin.includes("id:'main-summary'")&&resonanceFeature.includes('setPresentationSummary(parts.join'),'Resonance main summary must move from wasted plot-bottom space into the left side of the bottom status information stream on mobile.');

assert(dataCenter.includes("id:'data-control'")&&dataCenter.includes("presentationRole:'data-control'")&&!dataCenter.includes('isNativeClient')&&dataCenterCss.includes('.dc-source-preview{container-type:inline-size}')&&dataCenterCss.includes('@container (max-width:760px)'),'Data Center production Unit composition must publish the data rail semantically while accepted plugin CSS responds to actual Surface width without a Core domain patch.');

for(const rel of ['src/styles/platform/native-client-shell.css','src/styles/platform/native-workspace-presentation.css','src/plugins/resonance-workbench/plugin.css','src/plugins/data-center/plugin.css'])
  assert(!/!important/.test(read(rel)),`${rel} must not introduce !important while fixing mobile layout.`);

console.log('v3.67.27 Mobile shell density/overflow PASS: measured plugin-only top overflow, generated parameter drawer, preserved desktop-style status bar with strict AI>SMB>Web>Theme>Memory>DevTool retention, compact dark-safe header, anchored Theme settings, touch-following scientific tools and non-overlapping responsive scientific/data layouts.');
