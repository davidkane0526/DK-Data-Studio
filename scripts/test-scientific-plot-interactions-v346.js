const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/core/scientific-plot-runtime.js'),'utf8');
function classList(){const s=new Set();return {add:(...xs)=>xs.forEach(x=>s.add(x)),remove:(...xs)=>xs.forEach(x=>s.delete(x)),toggle(x,on){if(on===undefined)on=!s.has(x);on?s.add(x):s.delete(x);return on;},contains:x=>s.has(x)};}
const target={nodeType:1,id:'plot',dataset:{},classList:classList(),data:[],handlers:new Map(),on(name,fn){this.handlers.set(name,fn);},removeListener(name,fn){if(this.handlers.get(name)===fn)this.handlers.delete(name);}};
const calls={react:0,restyle:[],relayout:[],save:[]};
const chartScope={
  tooltipTheme:{bgcolor:'rgba(31,41,55,0.90)',bordercolor:'rgba(255,255,255,0.22)',font:{color:'#fff',size:12}},
  async react(t,data){calls.react++;t.data=structuredClone(data);},
  restyle(t,update,traces){calls.restyle.push({update,traces});return true;},
  relayout(t,update){calls.relayout.push(update);return true;},
  resize(){return true;},purge(){return true;},saveImage(t,base,format,options){calls.save.push({base,format,options});return {base,format};},toImage(){return 'data:image/png;base64,AA==';}
};
const entityRows=new Map();
const entityScope={upsert(row){entityRows.set(row.id,{...row});return entityRows.get(row.id);},get:id=>entityRows.get(id)||null,related:(a,b)=>a===b};
const context={console,structuredClone,setTimeout,clearTimeout,document:{getElementById:id=>id==='plot'?target:null,querySelector:()=>null},localStorage:{getItem:()=>null,setItem:()=>{}},DKDSCharts:{createScope:()=>chartScope,resize:()=>true,purge:()=>true,tooltipTheme:chartScope.tooltipTheme},DKDSEntities:{createScope:()=>entityScope}};
context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(code,context,{filename:'scientific-plot-runtime.js'});
let selectionListener=null;let selected=null;let selectedMany=[];
const interaction={
  select(payload,options){selected={payload,options};if(selectionListener)selectionListener({items:[payload],focus:payload},{reason:'select'});return payload;},
  selectMany(payloads,options){selectedMany=payloads;if(selectionListener)selectionListener({items:payloads,focus:payloads.at(-1)||null},{reason:'select-many'});return payloads;},
  clear(){if(selectionListener)selectionListener({items:[],focus:null},{reason:'clear'});},
  subscribe(fn,{immediate=false}={}){selectionListener=fn;if(immediate)fn({items:[],focus:null},{reason:'subscribe'});return()=>{selectionListener=null;};}
};
(async()=>{
  assert.deepStrictEqual([...context.DKDSScientificPlot.CONTROLLERS],['selection','legend','tooltip','focus','pin','viewport','export']);
  const scope=context.DKDSScientificPlot.createScope('test');
  const traces=[
    {x:[0,1],y:[1,2],mode:'lines+markers',name:'A',entityId:'trace:A',line:{width:2},marker:{size:6}},
    {x:[0,1],y:[2,3],mode:'lines+markers',name:'B',entityId:'trace:B',line:{width:2},marker:{size:6}}
  ];
  const view=await scope.react(target,traces,{}, {},{interaction,traceEntity:trace=>({id:trace.entityId,type:'data.series',label:trace.name}),legendPolicy:{selectOnClick:true},pinPolicy:{enabled:true},selectionPolicy:{area:true}});
  assert.strictEqual(context.DKDSScientificPlot.VERSION,'2.0.0');
  for(const name of context.DKDSScientificPlot.CONTROLLERS)assert(view.controllers[name],`missing ${name} controller`);
  for(const event of ['plotly_click','plotly_legendclick','plotly_legenddoubleclick','plotly_relayout','plotly_hover','plotly_unhover','plotly_selected','plotly_deselect'])assert(target.handlers.has(event),`missing ${event}`);
  const clickHandler=target.handlers.get('plotly_click');
  target.handlers.get('plotly_legendclick')({curveNumber:1});
  assert.strictEqual(selected.payload.id,'trace:B','legend controller must select mapped trace entity when enabled');
  clickHandler({points:[{curveNumber:0,pointNumber:0}],event:{shiftKey:true}});
  assert.strictEqual(selected.payload.id,'trace:A');
  assert(view.controllers.pin.has('trace:A'),'shift click must pin when pin policy is enabled');
  view.controllers.pin.unpin('trace:A');assert(!view.controllers.pin.has('trace:A'));
  target.handlers.get('plotly_selected')({points:[{curveNumber:0,pointNumber:0},{curveNumber:1,pointNumber:0}]});
  assert.strictEqual(selectedMany.length,2,'area selection must publish mapped entities when enabled');
  target.handlers.get('plotly_relayout')({'xaxis.range[0]':-.5,'xaxis.range[1]':1.5,'yaxis.range[0]':0,'yaxis.range[1]':4});
  assert.deepStrictEqual(view.controllers.viewport.get().xRange,[-.5,1.5]);
  await view.controllers.viewport.set({xRange:[0,1]},{source:'test'});assert(calls.relayout.some(row=>Array.isArray(row['xaxis.range'])),'viewport.set must delegate to Plotly relayout');
  await view.controllers.viewport.reset({source:'test'});assert(calls.relayout.some(row=>row['xaxis.autorange']===true),'viewport.reset must restore autorange');
  assert.strictEqual(view.controllers.legend.state().length,2);
  assert.strictEqual(view.controllers.tooltip.theme().bgcolor,'rgba(31,41,55,0.90)');
  await view.controllers.export.save('plot-test','png',{scale:2});assert.strictEqual(calls.save.at(-1).format,'png');
  await scope.react(target,traces,{}, {},{interaction,traceEntity:trace=>({id:trace.entityId,type:'data.series'}),legendPolicy:{selectOnClick:true}});
  assert.strictEqual(target.handlers.get('plotly_click'),clickHandler,'react must not duplicate or replace shared event handlers');
  assert.strictEqual(scope.controller(target,'pin'),view.controllers.pin,'scope.controller must expose shared controller');
  scope.dispose();
  assert.strictEqual(target.handlers.size,0,'dispose must remove every shared Plotly handler');
  console.log('v3.46 ScientificPlot shared Selection/Legend/Tooltip/Focus/Pin/Viewport/Export controller checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
