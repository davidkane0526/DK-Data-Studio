const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function classList(){const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x)};}
const target={nodeType:1,id:'plot',dataset:{},classList:classList(),data:[],handlers:new Map(),on(name,fn){this.handlers.set(name,fn);},removeListener(name,fn){if(this.handlers.get(name)===fn)this.handlers.delete(name);}};
const chartCalls={react:0,restyle:0,purge:0};
const chartScope={async react(t,data){chartCalls.react++;t.data=structuredClone(data);},restyle(){chartCalls.restyle++;},resize(){return true;},purge(){chartCalls.purge++;},saveImage(){return true;},relayout(){return true;}};
const context={console,structuredClone,document:{getElementById:id=>id==='plot'?target:null,querySelector:()=>null},DKDSCharts:{createScope:()=>chartScope,resize:()=>true,purge:()=>true}};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(read('src/core/entity-runtime.js'),context);vm.runInContext(read('src/core/scientific-plot-runtime.js'),context);
let selected=null;let subscription=null;const interaction={select(payload){selected=payload;},subscribe(fn,{immediate=false}={}){subscription=fn;if(immediate)fn({items:[],focus:null});return()=>{subscription=null;};}};
(async()=>{
 const scope=context.DKDSScientificPlot.createScope('test');
 await scope.react(target,[{x:[0,1],y:[1,2],line:{width:2},entityId:'trace:A'},{x:[0,1],y:[2,3],line:{width:2},entityId:'trace:B'}],{}, {},{interaction});
 assert.strictEqual(chartCalls.react,1);assert(target.handlers.has('plotly_click'),'Core ScientificPlot must own Plotly click lifecycle');
 const handler=target.handlers.get('plotly_click');handler({points:[{curveNumber:1,pointNumber:0}]});assert.strictEqual(selected.id,'trace:B');
 await scope.react(target,[{x:[0],y:[1],entityId:'trace:A'}],{}, {},{interaction});assert.strictEqual(target.handlers.get('plotly_click'),handler,'rerender must not duplicate/replace Core click handler');
 await scope.react(target,[{x:[0,1],y:[1,2],mode:'markers'}],{}, {},{interaction,pointEntity:({pointIndex})=>({id:`point:${pointIndex}`,type:'data.point'})});target.handlers.get('plotly_click')({points:[{curveNumber:0,pointNumber:1}]});assert.strictEqual(selected.id,'point:1','point-level entity mapping must drive selection');
 target.data=[{x:[5],y:[6],entityId:'existing'}];scope.attach(target,{interaction,traceEntity:trace=>trace.entityId});target.handlers.get('plotly_click')({points:[{curveNumber:0,pointNumber:0}]});assert.strictEqual(selected.id,'existing','attach must add Core interaction to already-rendered plots');
 scope.purge(target);assert(chartCalls.purge>=1);scope.dispose();
 console.log('v3.42 ScientificPlot managed lifecycle/entity-selection checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
