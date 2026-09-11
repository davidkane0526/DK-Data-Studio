'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const assert=(cond,msg)=>{if(!cond)throw new Error(msg);};
const atLeast=(actual,required)=>{const a=String(actual).split('.').map(Number),b=String(required).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d>0;}return true;};

assert(atLeast(json('package.json').version,'3.68.73'),'App version must remain at or above 3.68.73.');
assert(Number(json('mobile/app.json').expo.android.versionCode)>=95,'Android versionCode must advance for v3.68.73.');

const portable=read('src/core/ui/modules/layout/portable-view.js');
assert(!portable.includes('ensureFloatingDragHandleVisible'),'PortableView must not maintain a live drag-handle measurement recovery path.');
const dragStart=portable.indexOf("bindFloatDrag(mode='float')");
const dragEnd=portable.indexOf('\n    dispose()',dragStart);
assert(dragStart>=0&&dragEnd>dragStart,'bindFloatDrag implementation not found.');
const drag=portable.slice(dragStart,dragEnd);
assert(drag.includes('Capture all geometry once at pointerdown'),'Floating drag must document pointerdown geometry capture.');
assert(drag.includes('width:r.width,height:r.height,metrics'),'Floating drag must capture wrapper size and zone metrics at gesture start.');
const moveMatch=drag.match(/const move=e=>\{([\s\S]*?)\};\n\s*const up=/);
assert(moveMatch,'Floating drag move handler not found.');
const moveBody=moveMatch[1];
assert(!moveBody.includes('getBoundingClientRect'),'Floating pointermove must not force wrapper/handle layout reads.');
assert(!moveBody.includes('floatingZoneMetrics'),'Floating pointermove must not remeasure the floating zone.');
assert(moveBody.includes('this.setFloatingPosition(left,top,state.metrics)'),'Floating pointermove must use captured metrics and perform position writes only.');

const dc=read('src/plugins/data-center/plugin.css');
const bounded='.dc-chart-pane[data-placement="home"]>.dc-chart{height:var(--dc-chart-height);min-height:var(--dc-chart-min-height);max-height:var(--dc-chart-height);flex:0 0 var(--dc-chart-height);overflow:hidden;contain:layout paint}';
assert(dc.includes(bounded),'Data Center inline preview must have one explicit bounded block-size contract that descendants cannot inflate.');
assert(dc.includes('.dc-chart{height:var(--dc-chart-height);min-height:var(--dc-chart-min-height);box-sizing:border-box;overflow:hidden}'),'Data Center chart host must clip renderer overflow and keep border-box sizing stable.');
assert(!/\.dc-chart-pane\[data-placement="home"\][^{]*\{[^}]*max-height:none[^}]*\}/.test(dc.match(/\.dc-chart-pane\[data-placement="home"\]>.dc-chart\{[^}]*\}/)?.[0]||''),'Inline chart content must not return to an unbounded max-height.');

console.log('v3.68.73 floating drag performance + Data Center bounded preview geometry PASS.');
