'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const Analysis=require('../src/science/index.js');

class ClassList{constructor(){this.rows=new Set();}add(...rows){for(const row of rows)this.rows.add(String(row));}remove(...rows){for(const row of rows)this.rows.delete(String(row));}toggle(row,on){if(on===undefined)on=!this.rows.has(row);on?this.rows.add(row):this.rows.delete(row);return on;}contains(row){return this.rows.has(row);}}
class Element{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.children=[];this.parentNode=null;this.parentElement=null;this.dataset={};this.classList=new ClassList();this.attributes={};this.listeners={};this.textContent='';this.innerHTML='';this.value='';this.checked=false;this.disabled=false;this.spec=null;}
  appendChild(node){if(node==null)return node;this.children.push(node);node.parentNode=this;node.parentElement=this;return node;}
  append(...rows){for(const row of rows){if(row&&typeof row==='object')this.appendChild(row);else if(row!=null){const text=new Element('span');text.textContent=String(row);this.appendChild(text);}}}
  replaceChildren(...rows){this.children=[];for(const row of rows)this.appendChild(row);}
  setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}
  addEventListener(k,fn){(this.listeners[k]||(this.listeners[k]=[])).push(fn);}removeEventListener(){}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(row=>row!==this);this.parentNode=this.parentElement=null;}
}

const prodIds=['terVmin','terVmax','terVstep','terTolerance','terCurrentFloor','terOnlyFullyVisible','terAlgorithmSelect','terRecoverAlgorithmBtn','terColorScale','terColorMin','terColorMax','terColorTick','terXTick','terYTick','terSummary','terMaxVgTable','terMaxVdTable'];
const prodEls=new Map(prodIds.map(id=>[`#${id}`,new Element(id.includes('Table')?'table':id.includes('Select')||id==='terColorScale'?'select':id==='terOnlyFullyVisible'?'input':'div')]));
for(const id of ['terVmin','terVmax','terVstep','terTolerance','terCurrentFloor','terColorMin','terColorMax','terColorTick','terXTick','terYTick'])prodEls.get(`#${id}`).tagName='INPUT';
prodEls.get('#terOnlyFullyVisible').tagName='INPUT';prodEls.get('#terColorScale').value='Viridis';
const dom={query:selector=>prodEls.get(selector)||null,html:(el,html)=>{if(el)el.innerHTML=String(html??'');return el;},on:(el,event,fn)=>{el?.addEventListener?.(event,fn);return()=>{};}};

const reactiveListeners=new Set();
const reactive={
  subscribe(fn){reactiveListeners.add(fn);return()=>reactiveListeners.delete(fn);},
  touch(key,meta={}){const event={type:'touch',touched:[String(key)],meta:[meta]};for(const fn of [...reactiveListeners])fn(event);return event;},
  transact(name,fn){const touched=[];const tx={touch(keys,meta={}){for(const key of (Array.isArray(keys)?keys:[keys]))touched.push(String(key));if(meta.reason)tx.reason=meta.reason;}};fn?.(tx);const event={type:'transaction',touched,meta:[{reason:tx.reason||name}]};for(const cb of [...reactiveListeners])cb(event);return event;}
};

const context={console,structuredClone,setTimeout,clearTimeout,crypto:global.crypto,DKDSScience:Analysis,document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null}};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const rel of ['src/core/data/model.js','src/core/performance/runtime.js','src/core/scientific/pipeline-runtime.js','src/core/plugins/module-runtime.js','src/core/services/service-runtime.js','src/plugins/ter-analysis/analysis-service.js','src/plugins/ter-analysis/controller.js','src/plugins/ter-analysis/domain-adapter.js'])vm.runInContext(read(rel),context,{filename:rel});

function sweepDataset(){
  const step=.05,up=Array.from({length:41},(_,i)=>Number((-1+i*step).toFixed(12))),down=up.slice(0,-1).reverse(),points=[];
  for(const [direction,voltages] of [[1,up],[-1,down]])for(const v of voltages){const resonance=Math.exp(-Math.pow((v-(direction>0?.25:-.18))/.11,2)),base=1.2e-6*(1+.18*Math.abs(v)),i=base*(direction>0?1:1.7)*(1+1.9*resonance);points.push({v,i,index:points.length,sourceLine:points.length+2});}
  return {path:'ter-side-by-side::Id',name:'ter-side-by-side',sourcePath:'/tmp/ter-side-by-side.csv',sourceName:'ter-side-by-side.csv',vg:0,points};
}
function selectionModel(){let value={schema:'test',revision:0,items:[],focus:null,ranges:[],context:{},source:null};const listeners=new Set(),emit=(reason,meta={})=>{value.revision+=1;const snap=structuredClone(value);for(const fn of [...listeners])fn(snap,{reason,...meta});return snap;};return {get:()=>structuredClone(value),select(row,meta={}){const raw=row?.value||row||{},item={type:row?.type||raw.selectionType||'ter.matrix-point',id:String(row?.id||raw.id||'ter-point'),ref:{entityId:String(row?.id||raw.id||'ter-point'),vg:raw.vg,vd:raw.vds},meta:{}};value.items=[item];value.focus=item;value.source=meta.source||null;return emit('select',meta);},clear(meta={}){value.items=[];value.focus=null;value.ranges=[];value.source=meta.source||null;return emit('clear',meta);},subscribe(fn,{immediate=false}={}){listeners.add(fn);if(immediate)fn(structuredClone(value),{reason:'subscribe'});return()=>listeners.delete(fn);}};}
function summaryTexts(html){return [...String(html||'').matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map(row=>row[1].replace(/<[^>]+>/g,'').trim());}

(async()=>{
  const D=context.DKDSData,store=D.createStore(),dataset=sweepDataset();
  store.upsert(D.createTable({id:'source:ter-side-by-side',name:dataset.name,semanticType:'science.transport.iv',metadata:{importedSource:true,seriesPath:dataset.path,vg:dataset.vg,dataAssignments:['*']},source:{path:dataset.sourcePath,name:dataset.sourceName},columns:[{key:'Vd',role:'x',values:dataset.points.map(p=>p.v)},{key:'Id',role:'y',values:dataset.points.map(p=>p.i)},{key:'Vg',role:'group',values:dataset.points.map(()=>dataset.vg)},{key:'sourceLine',role:'index',values:dataset.points.map(p=>p.sourceLine)}]}));
  const perf=context.DKDSPerformance,scope=context.DKDSScientificPipeline.createScope('builtin.ter-analysis');
  const dataTypes={get:id=>({id}),infer:value=>value?.semanticType?{id:value.semanticType}:(value?.kind?{id:value.kind}:null),accepts:(actual,accepted)=>accepted.includes(actual)};
  const performance={stage:(ns,revision,key,compute,options)=>perf.stage(`builtin.ter-analysis.${ns}`,revision,key,compute,options),trimAll:options=>perf.trimPrefix('builtin.ter-analysis.',options)};
  const pipeline={register:(id,spec)=>scope.register(id,spec),run:(id,input,options={})=>scope.run(id,input,{...options,artifacts:store,dataTypes,performance}),runSync:(id,input,options={})=>scope.runSync(id,input,{...options,artifacts:store,dataTypes,performance}),snapshot:()=>scope.snapshot()};
  const algorithmRow={id:'ter.high-low-ratio',version:'1.0.0',category:'ter-analysis',owner:'builtin.standard-transport-algorithms',title:'TER High/Low'};
  const algorithms={list:({category}={})=>!category||category==='ter-analysis'?[algorithmRow]:[],resolve:ref=>String(ref?.id||ref||'').split('@')[0]===algorithmRow.id?algorithmRow:null,lock:ref=>({category:'ter-analysis',id:ref.id,version:ref.version||'1.0.0'}),run:async(_ref,input,{parameters}={})=>Analysis.computeTerMatrix(input,parameters?.settings||{}),provenance:()=>({pluginId:algorithmRow.owner,algorithmId:algorithmRow.id,algorithmVersion:algorithmRow.version,category:algorithmRow.category,title:algorithmRow.title})};
  const runtime=await context.DKDSPluginModules.require('builtin.ter-analysis','analysis-service').create({artifacts:store,science:Analysis,dataModel:D,pipeline,performance,algorithms,reactive,dom,setStatus(){},copyTextToClipboard(){},saveChartImage(){},scheduleSnapshot(){}});
  const selection=selectionModel(),registeredTypes=new Map();
  const controllerCtx={data:{types:{get:id=>registeredTypes.get(id)||null,register:(id,spec)=>{registeredTypes.set(id,spec);return spec;}}},ui:{selection:{refs:{normalize:value=>value,artifact:id=>({artifactId:id})},model:()=>selection},interaction:{create:()=>({selection})}}};
  const controller=context.DKDSPluginModules.require('builtin.ter-analysis','controller').create(controllerCtx,{service:runtime.service});
  const owner=context.DKDSServices.createScope('builtin.ter-analysis');
  context.DKDSPluginModules.require('builtin.ter-analysis','domain-adapter').provide({services:owner,data:{reactive}},runtime.service,controller);
  runtime.service.render();await runtime.service.autoParameters();const result=await runtime.service.calculate();assert(result,'production calculation required');runtime.service.render();

  const actionSpecs=new Map(),fieldSpecs=new Map(),checkSpecs=new Map(),tables=new Map(),surfaces=new Map(),transformForms=[];let composedMain=null;
  const append=(host,node)=>{host?.appendChild?.(node);return node;};
  const units={
    page:{create:host=>({element:append(host,new Element('section'))})},pageHeader:{create:(host,spec)=>{for(const row of spec.actions||[])actionSpecs.set(row.id,row);return {element:append(host,new Element('header'))};}},
    workspace:{create:()=>({compose(spec){composedMain=spec?.primary?.mainNode||null;},dispose(){}})},layout:{create:(host)=>append(host,new Element('div')),apply:target=>target},summary:{create:(host)=>({element:append(host,new Element('div'))})},chip:{create:(host,spec)=>{const el=append(host,new Element('span'));el.textContent=String(spec.text||'');return el;}},
    plotGroup:{create:host=>({adoptPlot(_id,card){host?.appendChild?.(card);return{};},setColumns(){},dispose(){}})},panel:{detached:()=>({element:new Element('section')}),create:(host)=>({element:append(host,new Element('section'))})},header:{create:(host,spec)=>{for(const row of spec.actions||[])actionSpecs.set(row.id,row);return {element:append(host,new Element('header'))};}},
    note:{create:(host,spec)=>{const el=append(host,new Element('div'));el.textContent=String(spec.text||'');return el;}},status:{create:(host,spec)=>{const el=append(host,new Element('div'));el.textContent=String(spec.text||'');return el;}},
    scientificPlot:{create:(_plot,spec)=>{const id=String(spec.source||'').split(':').pop(),surface={spec:{...spec},lastSpec:null,set(next){this.spec={...this.spec,...structuredClone(next)};this.lastSpec=structuredClone(next);return this;},dispose(){}};surfaces.set(id,surface);return surface;}},
    actionRow:{create:(_host,spec)=>{for(const row of spec.actions||[])actionSpecs.set(row.id,row);return{};}},section:{create:host=>({element:append(host,new Element('section')),body:new Element('div')})},
    table:{mount:(id,_host,spec)=>{const table={id,columns:spec.columns||[],rows:spec.rows||[],setData(columns,rows){this.columns=structuredClone(columns);this.rows=structuredClone(rows);},dispose(){}};tables.set(id,table);return table;}},
    field:{create:(host,spec)=>{const control=append(host,new Element(spec.kind==='select'?'select':'input'));control.value=spec.value===undefined?'':String(spec.value);control.onChange=spec.onChange;fieldSpecs.set(spec.label,{spec,control});return {element:control,control};}},
    action:{create:(_host,spec)=>{actionSpecs.set(spec.id,spec);return new Element('button');}},check:{create:(host,spec)=>{const input=append(host,new Element('input'));input.checked=!!spec.checked;input.onChange=spec.onChange;checkSpecs.set(spec.label,{spec,input});return {element:input,input};}},
    parameterForm:{mount:(_host,_schema,options)=>{const form={value:structuredClone(options.value||{}),onChange:options.onChange,setValue(next){this.value=structuredClone(next||{});},destroy(){},dispose(){}};transformForms.push(form);return form;}},prime:{build:spec=>spec}
  };
  const pageRoot=new Element('main');
  const shadowScope=context.DKDSServices.createScope('com.example.unit-ter-shadow',{dependencies:['builtin.ter-analysis']});
  let shadowActivate=null;context.DKDSPlugins={define:(_manifest,activate)=>{shadowActivate=activate;}};
  vm.runInContext(read('examples/sdk151-unit-ter-shadow/plugin.js'),context,{filename:'unit-ter-shadow/plugin.js'});
  assert.strictEqual(typeof shadowActivate,'function','shadow activation must be available');
  const shadowCtx={services:shadowScope,status:{set(){}},analysis:{providers:{get:()=>({})}},ui:{dom:{create:(tag,spec={})=>{const el=new Element(tag);Object.assign(el,spec);return el;}},unitTemplates:units,pages:{add:()=>pageRoot}}};
  const shadowRuntime=await shadowActivate(shadowCtx);await new Promise(resolve=>setTimeout(resolve,30));await shadowRuntime.syncLiveState();

  const pState=runtime.service.getState();
  const controlPairs=[['Vds min (V)','terVmin','vmin'],['Vds max (V)','terVmax','vmax'],['Vds step (V)','terVstep','vstep'],['配对容差 (V)','terTolerance','tolerance'],['电流下限 (A)','terCurrentFloor','currentFloor']];
  for(const [label,id,key] of controlPairs){assert.strictEqual(fieldSpecs.get(label).control.value,prodEls.get(`#${id}`).value,`side-by-side control mismatch: ${key}`);}
  assert.strictEqual(checkSpecs.get('仅使用正反扫均显示的数据文件').input.checked,prodEls.get('#terOnlyFullyVisible').checked,'onlyFullyVisible visible state must match');
  assert.strictEqual(fieldSpecs.get('色图').control.value,prodEls.get('#terColorScale').value,'color scale visible state must match');
  for(const [label,id] of [['色阶最小 (%)','terColorMin'],['色阶最大 (%)','terColorMax'],['色阶刻度 (%)','terColorTick'],['Vds 刻度 (V)','terXTick'],['Vg 刻度 (V)','terYTick']])assert.strictEqual(fieldSpecs.get(label).control.value,prodEls.get(`#${id}`).value,`${label} visible state must match`);
  assert.deepStrictEqual(transformForms[0].value,{type:pState.transform.type,direction:String(pState.transform.direction)},'transform form must mirror production state');

  const prodSummary=summaryTexts(prodEls.get('#terSummary').innerHTML),shadowSummary=shadowStateTexts(composedMain);
  function shadowStateTexts(rootEl){const summary=findNode(rootEl,node=>node.children?.length&&node.children.every(child=>child.tagName==='SPAN')&&node.children.some(child=>String(child.textContent).startsWith('Vg 数：')));return summary?summary.children.map(child=>child.textContent):[];}
  function findNode(node,predicate){if(predicate(node))return node;for(const child of node.children||[]){const found=findNode(child,predicate);if(found)return found;}return null;}
  assert.deepStrictEqual(shadowSummary,prodSummary,'summary chips must be visibly identical to production');

  const vgExpected=(result.terMaxByVg||[]).map(row=>({vg:String(row.vg),terMax:Number(row.terMax).toPrecision(7),vdsAtMax:String(row.vdsAtMax),iUp:Number(row.iUp).toExponential(6),iDown:Number(row.iDown).toExponential(6),rUp:Number(row.rUp).toExponential(6),rDown:Number(row.rDown).toExponential(6),mode:row.manual?'手动':'自动'}));
  const vdExpected=(result.terMaxByVd||[]).map(row=>({vds:String(row.vds),terMax:Number(row.terMax).toPrecision(7),vgAtMax:String(row.vgAtMax),iUp:Number(row.iUp).toExponential(6),iDown:Number(row.iDown).toExponential(6),rUp:Number(row.rUp).toExponential(6),rDown:Number(row.rDown).toExponential(6),mode:row.manual?'手动':'自动'}));
  assert.deepStrictEqual(tables.get('ter-shadow-max-vg-table').rows,vgExpected,'TER_Max–Vg visible rows must match production formatting');
  assert.deepStrictEqual(tables.get('ter-shadow-max-vd-table').rows,vdExpected,'TER_Max–Vd visible rows must match production formatting');
  assert.strictEqual(tables.get('ter-shadow-max-vg-table').columns.length,8,'Unit table must carry the full production 8-column presentation');
  assert.strictEqual(tables.get('ter-shadow-max-vd-table').columns.length,8,'Unit table must carry the full production 8-column presentation');

  const heatmap=surfaces.get('ter-shadow-heatmap').lastSpec.data[0];assert.deepStrictEqual(heatmap.x,result.targets);assert.deepStrictEqual(heatmap.y,result.vgs);assert.deepStrictEqual(heatmap.z,result.matrix,'Unit heatmap must render the authoritative production matrix');
  const transform=owner.domain.list()[0]&&shadowScope.domain.connect('builtin.ter-analysis/live').snapshot().state.derived.transformMatrix;assert(transform,'production adapter must expose the production transform projection');
  const transformPlot=surfaces.get('ter-shadow-transform').lastSpec.data[0];assert.deepStrictEqual(transformPlot.x,transform.targets);assert.deepStrictEqual(transformPlot.y,transform.vgs);assert.deepStrictEqual(transformPlot.z,transform.matrix,'transform heatmap must use production-owner derived matrix');
  assert.deepStrictEqual(surfaces.get('ter-shadow-max-vg').lastSpec.data[0].x,(result.terMaxByVg||[]).map(row=>row.vg));assert.deepStrictEqual(surfaces.get('ter-shadow-max-vg').lastSpec.data[0].y,(result.terMaxByVg||[]).map(row=>row.terMax));
  assert.deepStrictEqual(surfaces.get('ter-shadow-max-vg-arg').lastSpec.data[0].y,(result.terMaxByVg||[]).map(row=>row.vdsAtMax));assert.deepStrictEqual(surfaces.get('ter-shadow-max-vd').lastSpec.data[0].y,(result.terMaxByVd||[]).map(row=>row.terMax));assert.deepStrictEqual(surfaces.get('ter-shadow-max-vd-arg').lastSpec.data[0].y,(result.terMaxByVd||[]).map(row=>row.vgAtMax));
  assert.strictEqual(surfaces.size,7,'all seven Unit PlotViews must receive live production presentation data');

  const floor=fieldSpecs.get('电流下限 (A)');floor.spec.onChange({target:{value:'2e-15'}});await new Promise(resolve=>setTimeout(resolve,30));assert.strictEqual(runtime.service.getState().settings.currentFloor,2e-15,'Unit input must mutate the single production state owner');assert.strictEqual(floor.control.value,'2e-15','production state notification must flow back to Unit visible control');
  const scale=fieldSpecs.get('色图');scale.spec.onChange({target:{value:'Turbo'}});await new Promise(resolve=>setTimeout(resolve,30));assert.strictEqual(runtime.service.getState().display.colorscale,'Turbo','Unit display action must mutate production owner');assert.strictEqual(scale.control.value,'Turbo','display state must round-trip back to Unit shell');
  transformForms[0].onChange({type:'didv',direction:'-1'},{ok:true});await new Promise(resolve=>setTimeout(resolve,30));assert.strictEqual(runtime.service.getState().transform.direction,-1,'Unit transform interaction must mutate production owner');assert.strictEqual(transformForms[0].value.direction,'-1','transform state must round-trip to Unit form');

  const selected=(result.terMaxByVg||[])[0];controller.select({vg:selected.vg,vds:selected.vdsAtMax,ter:selected.terMax,id:'acceptance-point',selectionType:'ter.matrix-point'},{source:'side-by-side-test'});await new Promise(resolve=>setTimeout(resolve,30));const status=findNode(composedMain,node=>String(node.textContent||'').startsWith('当前联动：'));assert(status&&status.textContent.includes(`Vg=${selected.vg}`),'production selection must project into Unit resistance status');actionSpecs.get('clear-highlight').onInvoke();await new Promise(resolve=>setTimeout(resolve,30));assert.strictEqual(controller.getSelection().items.length,0,'Unit clear-highlight must clear the production controller selection');const cleared=findNode(composedMain,node=>String(node.textContent||'').startsWith('尚未选择 TER 数据点'));assert(cleared,'clear-selection effect must round-trip visibly to Unit shell');

  assert(shadowRuntime.shadowState.liveParity.numericDigest,'shadow must expose numeric parity digest');assert(shadowRuntime.shadowState.liveParity.presentationDigest,'shadow must expose presentation parity digest');
  shadowRuntime.deactivate();shadowScope.dispose();owner.dispose();runtime.dispose?.();
  console.log(`SDK 1.51.6 TER side-by-side live presentation acceptance PASS: controls=${controlPairs.length+7}, tables=2, plots=${surfaces.size}, grid=${result.vgs.length}x${result.targets.length}.`);
})().catch(error=>{console.error(error);process.exit(1);});
