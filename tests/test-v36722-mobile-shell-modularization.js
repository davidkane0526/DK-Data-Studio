'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const stat=rel=>fs.statSync(path.join(root,rel));
const pkg=JSON.parse(read('package.json'));
const mobilePkg=JSON.parse(read('mobile/package.json'));
const mobileApp=JSON.parse(read('mobile/app.json')).expo;
const facade=read('mobile/src/Shell.tsx');
const required=[
  'mobile/src/model/shell-types.ts',
  'mobile/src/model/shell-model.ts',
  'mobile/src/theme/palette.ts',
  'mobile/src/components/NativeHeader.tsx',
  'mobile/src/components/NativeStatusBar.tsx',
  'mobile/src/sheets/ShellActionSheet.tsx',
  'mobile/src/styles/shell-styles.ts',
];

{const [major,minor,patch]=String(pkg.version).split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=22))),'Mobile Shell Phase 1 must remain present from v3.67.22 onward.');}
assert(mobilePkg.version===require('../package.json').version||/^0\.8\.(?:1[4-9]|[2-9]\d|\d{3,})$/.test(mobilePkg.version),'React Native package must retain the Phase 1 baseline or use the synchronized app version.');
assert.strictEqual(mobileApp.version,mobilePkg.version,'Expo and mobile package versions must stay synchronized.');
assert(Number(mobileApp.android.versionCode)>=25,'Android versionCode must remain at or beyond the Phase 1 checkpoint.');
assert(stat('mobile/src/Shell.tsx').size<2048,'Shell.tsx must remain a thin compatibility/public barrel, not return to a monolithic implementation.');
for(const rel of required){
  assert(fs.existsSync(path.join(root,rel)),`Mobile shell module missing: ${rel}`);
  assert(stat(rel).size<48*1024,`Mobile authored module exceeds the Core 48 KiB hygiene ceiling: ${rel}`);
}
for(const token of [
  "export { NativeHeader } from './components/NativeHeader'",
  "export { NativeStatusBar } from './components/NativeStatusBar'",
  "export { ShellActionSheet } from './sheets/ShellActionSheet'",
  "export { paletteFor } from './theme/palette'",
]) assert(facade.includes(token),`Shell facade missing public export: ${token}`);
assert(!facade.includes('StyleSheet.create')&&!facade.includes('function NativeHeader')&&!facade.includes('const navigationItems'),'Shell facade must not regain implementation ownership.');

const model=read('mobile/src/model/shell-model.ts');
const types=read('mobile/src/model/shell-types.ts');
const palette=read('mobile/src/theme/palette.ts');
const header=read('mobile/src/components/NativeHeader.tsx');
const status=read('mobile/src/components/NativeStatusBar.tsx');
const sheets=read('mobile/src/sheets/ShellActionSheet.tsx');
const styles=read('mobile/src/styles/shell-styles.ts');
const mobileSource=[facade,model,types,palette,header,status,sheets,styles].join('\n');

assert(!/from ['"]react-native['"]/.test(model+types+palette),'Platform-neutral shell model/theme projection must not import React Native UI primitives.');
assert(model.includes('navigableSurfaces')&&model.includes('surfaceDetail')&&model.includes('surfaceRequestId'),'Surface projection helpers must have one model owner.');
assert(palette.includes('nativeThemeColor(tokens.divider')&&palette.includes('nativeThemeColor(tokens.controlBorder'),'Native theme palette must retain semantic Theme Contract channels.');
assert(header.includes('activeProject')&&header.includes("onAction('history-undo')")&&header.includes("onAction('history-redo')"),'NativeHeader must retain project and history chrome behavior after extraction.');
assert(header.includes('GLOBAL_ACTIONS')&&header.includes("{ id: 'activities', label: '分析' }")&&header.includes("{ id: 'data', label: '数据' }")&&!header.includes('SystemGlyph'),'Responsive theme-colored text global navigation must remain in the active NativeHeader after the obsolete bottom/rail navigation family is retired.');
assert(status.includes('NativeStatusBar')&&status.includes('webService'),'Native status chrome must remain isolated from navigation geometry.');
assert(sheets.includes('ProjectDrawer')&&sheets.includes('ShellActionSheet')&&sheets.includes("run('workspace-action'"),'Sheets must retain project, activity, surface and plugin-action routing.');
assert(!facade.includes('WebServicePopover'),'Retired duplicate RN Web Service panel must not return to the shell facade; the Core WebView Material panel is the single owner.');
assert(styles.includes('export const shellStyles = StyleSheet.create')&&!/headerPanelButton|headerPanelButtonText|projectDrawerChevron/.test(styles),'Mobile shell styling must have one owner and omit the three dead style keys removed during the split.');
assert(!/ctx\.ui\.(?:desktop|mobile)\b/.test(mobileSource),'Mobile shell must not create a platform-specific Plugin API facade.');
assert(!/builtin\.(?:resonance|ter|pulse|data-center)/.test(mobileSource),'Mobile shell must remain domain-plugin neutral.');

console.log('v3.67.22 Mobile Shell Phase 1 PASS: monolithic Shell split into model/theme/components/sheets/services/styles with public facade preserved.');
