'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert(Number(json('package.json').version.split('.').at(-1))>=56,'App version must retain the v3.71.56+ baseline.');
const manifest=json('src/plugins/transfer-vth-lab/plugin.json');
assert(Number(manifest.version.split('.').at(-1))>=3,'Vth must retain the accepted 3.3.3+ baseline.');
assert.deepStrictEqual(manifest.styles,[],'Vth default-settings fix must not restore private plugin CSS.');

const plugin=read('src/plugins/transfer-vth-lab/plugin.js');
assert(plugin.includes("const analysisDefaultKeys=Object.freeze(['method','branch','targetCurrent','lowCurrent','highCurrent','absoluteCurrent'])"),'Vth default settings must be limited to analysis defaults.');
assert(plugin.includes("description:'仅影响新建或重置工程的分析参数；不会修改当前工程、数据图显示方式或界面样式。'"),'Vth settings dialog must explicitly state non-mutating current-project semantics.');
assert(!/fields:\[[\s\S]*?id:'logY'/.test(plugin),'Vth default-settings fields must not persist presentation-only logY.');
assert(!/fields:\[[\s\S]*?id:'showAllCurves'/.test(plugin),'Vth default-settings fields must not persist presentation-only showAllCurves.');
assert(plugin.includes('const projectDefaultParameters=()=>'),'Vth must resolve project defaults dynamically.');
assert(plugin.includes('const initialState=()=>({schema:3,parameters:projectDefaultParameters()'),'Vth new/reset project state must read the latest settings value.');
assert(plugin.includes("reset:()=>state.set(initialState())"),'Vth project reset must not reuse a stale activation-time snapshot.');
assert(plugin.includes("const offSettings=settings.subscribe((_value,meta={})=>{ctx.status.set("),'Vth must provide explicit feedback when defaults are saved/reset.');
assert(plugin.includes('当前工程与界面保持不变'),'Vth settings feedback must promise current-project/UI stability.');
assert(!/settings\.subscribe[\s\S]{0,500}state\.(?:set|patch)\(/.test(plugin),'Saving plugin defaults must not mutate the active Vth project state.');

const sdk=read('sdk/README.md');
assert(sdk.includes('不要永久缓存激活瞬间的默认快照'),'SDK authoring guidance must document dynamic re-read of plugin defaults for new/reset project state.');
assert(sdk.includes('不要混入“新工程默认分析参数”'),'SDK guidance must keep presentation-only state out of analysis defaults.');

console.log('v3.71.56 Vth default-settings semantics closure PASS');
