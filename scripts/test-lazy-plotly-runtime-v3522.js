const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const {URL}=require('url');
const root=path.resolve(__dirname,'..');
const chartCode=fs.readFileSync(path.join(root,'src/core/chart-runtime.js'),'utf8');
const window={};
const listeners={};
const plot={nodeType:1};
const head={appendChild(script){
  queueMicrotask(()=>{
    window.Plotly={
      react(el,data,layout,config){plot.data=data;plot.layout=layout;plot.config=config;return Promise.resolve(el);},
      restyle(){return Promise.resolve();},relayout(){return Promise.resolve();},
      toImage(){return Promise.resolve('data:image/svg+xml,%3Csvg%3E%3C/svg%3E');},
      purge(){},Plots:{resize(){}}
    };
    script._listeners?.load?.();
  });
  return script;
}};
const document={
  currentScript:{src:'file:///app/src/core/chart-runtime.js'},head,
  getElementById:id=>id==='plot'?plot:null,
  querySelector:()=>null,
  createElement(tag){assert.equal(tag,'script');return {dataset:{},addEventListener(name,fn){this._listeners=this._listeners||{};this._listeners[name]=fn;}};}
};
const context={window,document,console,Promise,Date,URL,queueMicrotask,performance:{now:()=>Date.now()}};context.globalThis=context;window.window=window;window.document=document;
vm.createContext(context);vm.runInContext(chartCode,context,{filename:'chart-runtime.js'});
assert.equal(window.Plotly,undefined,'Plotly must not be loaded just by constructing Core Chart Runtime.');
window.DKDSCharts.configureRuntime({plotlyAllowed:true,plotlySource:'file:///app/node_modules/plotly.js-dist-min/plotly.min.js',host:'dedicated-top'});
const before=window.DKDSCharts.runtimeState();assert.equal(before.status,'idle');assert.equal(before.ready,false);
const a=window.DKDSCharts.react('plot',[{x:[1],y:[2]}],{},{});
const b=window.DKDSCharts.ensurePlotly({reason:'concurrent-smoke'});
Promise.all([a,b]).then(()=>{
  const after=window.DKDSCharts.runtimeState();
  assert.equal(after.status,'ready');assert.equal(after.ready,true);assert(after.requests>=2);assert(after.reuses>=1,'Concurrent Plotly requests must share one loader promise.');
  assert.equal(plot.data.length,1,'Lazy-loaded Plotly must render the queued chart.');
  console.log('v3.52.2 lazy Plotly Core Chart Runtime checks passed.');
}).catch(err=>{console.error(err);process.exitCode=1;});
