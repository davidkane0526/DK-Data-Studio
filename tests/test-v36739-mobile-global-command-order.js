'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const [major,minor,patch]=String(pkg.version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=39))),'Mobile global command order requires v3.67.39+.');

const header=read('mobile/src/components/NativeHeader.tsx');
const styles=read('mobile/src/styles/shell-styles.ts');
const block=header.slice(header.indexOf('const GLOBAL_ACTIONS = ['),header.indexOf('] as const;',header.indexOf('const GLOBAL_ACTIONS = ['))+11);
const expected=[
  "{ id: 'import-sheet', label: '导入' }",
  "{ id: 'data', label: '数据' }",
  "{ id: 'home', label: '工作区' }",
  "{ id: 'activities', label: '分析' }",
  "{ id: 'plugins', label: '插件' }",
];
let cursor=-1;
for(const token of expected){
  const next=block.indexOf(token);
  assert(next>=0,`Missing global command: ${token}`);
  assert(next>cursor,`Global Mobile command order must be 导入 / 数据 / 工作区 / 分析 / 插件; ${token} is out of order.`);
  cursor=next;
}
assert((block.match(/label:/g)||[]).length===5,'Global Mobile command group must contain exactly the five accepted first-level commands.');
assert(header.includes("else if (id === 'plugins') onAction('plugins');")&&!header.includes("onSheet('plugins')"),'Plugin must dispatch directly to the canonical Plugin Manager action, not a mixed workspace sheet.');
const utility=header.slice(header.indexOf('<View style={shellStyles.headerUtilityGroup}>'));
assert(!utility.includes('accessibilityLabel="插件"')&&!utility.includes('>插件</Text>'),'Plugin Management must not return to the right-side Undo/Redo/Parameters utility group.');
assert(!styles.includes('headerPluginButton')&&!styles.includes('headerPluginText'),'Dead dedicated Plugin utility styles must remain removed.');
console.log('v3.67.39 Mobile global command order PASS: 导入 / 数据 / 工作区 / 分析 / 插件.');
