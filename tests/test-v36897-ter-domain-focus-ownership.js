'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');

function classList(){return {add(){},remove(){},toggle(){},contains(){return false;}};}
const target={nodeType:1,id:'focus-off',dataset:{},data:[],layout:{},classList:classList(),handlers:new Map(),domHandlers:new Map(),addEventListener(n,f){this.domHandlers.set(n,f);},removeEventListener(){}};
const overlays=[];
const chart={
  tooltipTheme:{},
  async react(t,data,layout,config){t.data=structuredClone(data);t.layout=layout;t._context=config;},
  bind(t,name,fn){t.handlers.set(name,fn);return()=>t.handlers.delete(name);},
  selectionOverlay(_t,update,traces){overlays.push({update,traces});return true;},
  adoptDisplayScale(){},themePaint(){},selectLegendForTrace(){},clearLegendSelection(){},relayout(){return true;},resize(){return true;},purge(){return true;}
};
const entities=new Map();
const refs={
  series:(artifactId,seriesId)=>({artifactId,seriesId}),
  identity:ref=>`${ref.artifactId}::${ref.seriesId}`,
  normalize:ref=>({...ref}),sourceRowKey:()=>''
};
const context={console,structuredClone,setTimeout,clearTimeout,document:{getElementById:()=>null,querySelector:()=>null},localStorage:{getItem:()=>null,setItem(){}},DKDSUI:{selectionReferences:refs},DKDSCharts:{createScope:()=>chart,tooltipTheme:{}},DKDSEntities:{createScope:()=>({upsert(row){entities.set(row.id,row);return row;},get:id=>entities.get(id)||null,related:(a,b)=>a===b})}};
context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'src/core/scientific/plot-runtime.js'),'utf8'),context);
let subscriber=null;
const interaction={subscribe(fn,{immediate}={}){subscriber=fn;if(immediate)fn({schema:2,revision:0,items:[],focus:null,ranges:[],context:{}},{});return()=>{};},select(){},get(){return null;}};

(async()=>{
  const scope=context.DKDSScientificPlot.createScope('focus-owner-test');
  await scope.react(target,[
    {artifactId:'a',seriesId:'up',entityType:'data.sweep',x:[0,1],y:[1,2],mode:'lines',opacity:.58,line:{width:1.5}},
    {artifactId:'a',seriesId:'down',entityType:'data.sweep',x:[0,1],y:[2,1],mode:'lines',opacity:.58,line:{width:1.5}}
  ],{}, {},{interaction,selectionTarget:'series',controllers:{focus:{enabled:false}}});
  overlays.length=0;
  const item={type:'data.sweep',id:'a::up',ref:{artifactId:'a',seriesId:'up'}};
  subscriber({schema:2,revision:1,items:[item],focus:item,ranges:[],context:{}},{reason:'domain-focus'});
  assert.strictEqual(overlays.length,0,'focus.enabled=false must leave domain-owned selection visuals untouched while keeping the interaction subscription alive');

  const ter=fs.readFileSync(path.join(root,'src/plugins/ter-analysis/feature-runtime.js'),'utf8');
  assert(ter.includes("const DOMAIN_FOCUS={focus:{enabled:false}}"),'TER must declare one shared domain-owned focus policy');
  assert((ter.match(/controllers:DOMAIN_FOCUS/g)||[]).length===3,'TER primary heatmap, transformed heatmap and R-V must all disable generic Core focus paint');
  console.log('v3.68.97 TER domain focus ownership PASS');
})().catch(err=>{console.error(err);process.exit(1);});
