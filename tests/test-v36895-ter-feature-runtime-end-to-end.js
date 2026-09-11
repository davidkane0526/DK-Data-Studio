'use strict';
const assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'..');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function node(id=''){
  return {id,data:[],layout:{},dataset:{},textContent:'',innerHTML:'',offsetParent:{},className:'',
    classList:{contains:()=>false,add(){},remove(){},toggle(){}},before(){},closest(){return null;}};
}

(async()=>{
  const previousWindow=global.window;
  const modules=new Map();
  const moduleRuntime={
    define:(pid,name,value)=>{modules.set(`${pid}/${name}`,value);return value;},
    get:(pid,name)=>modules.get(`${pid}/${name}`)||null,
    require:(pid,name)=>{const value=modules.get(`${pid}/${name}`);if(!value)throw new Error(`missing ${pid}/${name}`);return value;}
  };
  global.window={DKDSPluginModules:moduleRuntime};
  try{
    for(const rel of ['src/plugins/ter-analysis/feature-utils.js','src/plugins/ter-analysis/selection-link-runtime.js','src/plugins/ter-analysis/feature-runtime.js']){
      const file=path.join(root,rel);delete require.cache[require.resolve(file)];require(file);
    }
    const feature=moduleRuntime.require('builtin.ter-analysis','feature-runtime');
    assert(feature?.mount,'TER feature runtime must expose mount()');

    const page=node('terMaxPage'),heatmap=node('terHeatmapPlot'),resistance=node('terResistancePlot'),card=node('terResistanceCard'),selectionLabel=node('terResistanceSelection'),header=node('terHeader');
    const maxVgPlot=node('terMaxVgPlot'),maxVgArgPlot=node('terMaxVgArgPlot'),maxVdPlot=node('terMaxVdPlot'),maxVdArgPlot=node('terMaxVdArgPlot');
    const selectorMap=new Map([
      ['#terMaxPage',page],['#terHeatmapPlot',heatmap],['#terResistancePlot',resistance],['#terResistanceCard',card],['#terResistanceSelection',selectionLabel],
      ['#terMaxVgPlot',maxVgPlot],['#terMaxVgArgPlot',maxVgArgPlot],['#terMaxVdPlot',maxVdPlot],['#terMaxVdArgPlot',maxVdArgPlot]
    ]);
    const dom={
      query(selector,_root){if(selector==='.analysis-page-header')return header;return selectorMap.get(selector)||null;},
      all(){return [];},create(){return node();},append(){},on(){return()=>{};},frame(fn){fn();},token(){},style(){},html(el,html){if(el)el.innerHTML=String(html);},timeout(fn){return setTimeout(fn,0);}
    };
    const eventHandlers=new Map();
    const events={on(name,fn){if(!eventHandlers.has(name))eventHandlers.set(name,[]);eventHandlers.get(name).push(fn);return()=>{};}};
    const fire=(name,payload)=>{for(const fn of eventHandlers.get(name)||[])fn(payload);};
    const restyles=[],relayouts=[],reductionSpecs=new Map();let heatmapSpec=null,resistanceSpec=null,canonicalSubscriber=null,pluginSelectCalls=0;
    const scientificPlot={
      scalarField(target,field,options){if(target===heatmap)heatmapSpec={field,options};target.data=[{type:'heatmap'}];return Promise.resolve(target);},
      react(target,traces,layout,_config,spec){target.data=traces;target.layout=layout;if(target===resistance)resistanceSpec={traces,layout,spec};else if([maxVgPlot,maxVgArgPlot,maxVdPlot,maxVdArgPlot].includes(target))reductionSpecs.set(target.id,{traces,layout,spec});return Promise.resolve(target);},
      restyle(target,patch,indices){if(target===resistance)restyles.push({patch,indices});return target;},
      relayout(target,patch){if(target===resistance)relayouts.push(patch);Object.assign(target.layout,patch);return target;},
      resize(){},purge(target){target.data=[];},saveImage(){return Promise.resolve();}
    };
    const ref=(vg,source,direction)=>({artifactId:`artifact:${source}`,seriesId:`sweep:${vg}:${direction>0?'up':'down'}`});
    const result={
      targets:[.1,.2],vgs:[-10,0,10],matrix:[[5,6],[7,8],[9,10]],
      records:[
        {vg:-10,vds:.1,rUp:100,rDown:200,ter:100,sourceFile:'A',iUp:1e-3,iDown:5e-4},
        {vg:-10,vds:.2,rUp:110,rDown:210,ter:90,sourceFile:'A',iUp:1e-3,iDown:5e-4},
        {vg:0,vds:.1,rUp:120,rDown:240,ter:100,sourceFile:'B',iUp:1e-3,iDown:5e-4},
        {vg:0,vds:.2,rUp:130,rDown:260,ter:100,sourceFile:'B',iUp:1e-3,iDown:5e-4},
        {vg:10,vds:.1,rUp:140,rDown:280,ter:100,sourceFile:'C',iUp:1e-3,iDown:5e-4},
        {vg:10,vds:.2,rUp:150,rDown:300,ter:100,sourceFile:'C',iUp:1e-3,iDown:5e-4}
      ],terMaxByVg:[
        {vg:-10,terMax:100,vdsAtMax:.1,iUp:1e-3,iDown:5e-4,rUp:100,rDown:200,sourceFile:'A'},
        {vg:0,terMax:100,vdsAtMax:.2,iUp:1e-3,iDown:5e-4,rUp:130,rDown:260,sourceFile:'B'},
        {vg:10,terMax:100,vdsAtMax:.1,iUp:1e-3,iDown:5e-4,rUp:140,rDown:280,sourceFile:'C'}
      ],terMaxByVd:[
        {vds:.1,terMax:100,vgAtMax:0,iUp:1e-3,iDown:5e-4,rUp:120,rDown:240,sourceFile:'B'},
        {vds:.2,terMax:100,vgAtMax:10,iUp:1e-3,iDown:5e-4,rUp:150,rDown:300,sourceFile:'C'}
      ]
    };
    const interaction={subscribe(fn,{immediate}={}){canonicalSubscriber=fn;if(immediate)fn({schema:2,items:[],focus:null,ranges:[],context:{}},{reason:'subscribe'});return()=>{canonicalSubscriber=null;};}};
    const controller={
      interaction,sourceScanReference:ref,getState:()=>({result,display:{}}),getTransformMatrix:()=>null,getTransformSettings:()=>({type:'didv',direction:1}),
      render(){},select(){pluginSelectCalls++;},clearSelection(){},serialize:()=>({}),restore(){},reset(){},autoParameters(){},calculate(){},applyDisplay(){},resetDisplay(){},setOnlyFullyVisible(){},
      exportLong(){},copyLong(){},exportMatrix(){},copyMatrix(){},exportHeatmapSvg(){},exportHeatmapPng(){},exportMaxVg(){},copyMaxVg(){},exportMaxVgSvg(){},exportMaxVgPng(){},exportMaxVd(){},copyMaxVd(){},exportMaxVdSvg(){},exportMaxVdPng(){}
    };
    const ctx={
      runtime:{isAuxiliaryWindow:true,isNativeClient:false},ui:{dom,scientificPlot,activities:{add(){}},pages:{add:()=>page},actions:{mount:()=>({render(){}})},topWorkspace:{register(){}},shortcuts:{add(){}}},
      workspace:{openPage(){}},events,project:{capture(){},registerSlice(){}},status:{set(){}},data:{reactive:null,transforms:{list:()=>[]}},parameters:null,
      analysis:{providers:{register(){}},algorithms:{run(){}}},tasks:{submit(){return {promise:Promise.resolve([]),cancel(){}};}},io:{saveText(){return Promise.resolve();}}
    };
    const mounted=await feature.mount(ctx,controller,{pageHtml:()=>'',attach:()=>null},{});
    fire('analysis:refresh',{id:'terMaxPage'});await tick();await tick();
    assert(heatmapSpec&&resistanceSpec,'real TER feature runtime must render both the primary heatmap and R–V view');
    assert.strictEqual(heatmapSpec.field.sourceScans.length,3,'primary heatmap must carry one stable source-scan reference per Vg row');
    assert.deepStrictEqual(heatmapSpec.field.sourceScans[1].ref,ref(0,'B',1),'Vg=0 heatmap row must identify source B by canonical sweep reference');
    assert.strictEqual(resistanceSpec.spec.selectionTarget,'series','R–V view must select the stable source scan rather than display-point identity');
    assert.strictEqual(heatmapSpec.options.controllers?.focus?.enabled,false,'TER heatmap must keep canonical Interaction but leave exact selection paint to TER');
    assert.strictEqual(resistanceSpec.spec.controllers?.focus?.enabled,false,'TER R–V must not compete with Core generic focus paint for paired forward/reverse highlighting');
    assert.strictEqual(reductionSpecs.size,4,'all four TER reduction plots must render through ScientificPlot');
    for(const id of ['terMaxVgPlot','terMaxVgArgPlot','terMaxVdPlot','terMaxVdArgPlot'])assert.strictEqual(typeof reductionSpecs.get(id)?.spec?.pointEntity,'function',`${id} must project points onto canonical source-scan entities`);
    assert.deepStrictEqual(reductionSpecs.get('terMaxVgPlot').spec.pointEntity({pointIndex:1}).ref,ref(0,'B',1),'TER_Max–Vg must map its selected maximum back to source B / Vg=0');
    assert.deepStrictEqual(reductionSpecs.get('terMaxVgArgPlot').spec.pointEntity({pointIndex:1}).ref,ref(0,'B',1),'Vd@TER_Max–Vg must share the same source-scan identity');
    assert.deepStrictEqual(reductionSpecs.get('terMaxVdPlot').spec.pointEntity({pointIndex:0}).ref,ref(0,'B',1),'TER_Max–Vd must map the winning Vg/source back to its source scan');
    assert.deepStrictEqual(reductionSpecs.get('terMaxVdArgPlot').spec.pointEntity({pointIndex:1}).ref,ref(10,'C',1),'Vg@TER_Max–Vd must map to the correct source scan independently of plot coordinates');

    // Simulate the actual Core ordering for a reduction-plot click: Core first
    // selects pointEntity(), then the plugin preserves the exact local Vds.
    restyles.length=0;relayouts.length=0;
    const reductionSpec=reductionSpecs.get('terMaxVgPlot').spec;
    const reductionEntity=reductionSpec.pointEntity({pointIndex:1});
    canonicalSubscriber({schema:2,revision:1,items:[reductionEntity],focus:reductionEntity,ranges:[],context:{}},{reason:'test-core-reduction-source-scan'});
    reductionSpec.onClick({points:[{pointIndex:1,pointNumber:1}]});
    const reductionOpacity=restyles.find(row=>Array.isArray(row.patch?.opacity));
    assert.deepStrictEqual(reductionOpacity?.patch?.opacity,[.035,.035,1,1,.035,.035],'TER reduction-plot click must isolate the corresponding R–V source group');
    assert(restyles.some(row=>row.patch?.x?.[0]?.[0]===.2&&row.patch?.y?.[0]?.[0]===130),'TER reduction-plot click must emphasize the exact forward R–V point');
    assert(restyles.some(row=>row.patch?.x?.[0]?.[0]===.2&&row.patch?.y?.[0]?.[0]===260),'TER reduction-plot click must emphasize the exact reverse R–V point');
    assert(relayouts.some(row=>row.shapes?.[0]?.x0===.2),'TER reduction-plot click must move the exact Vds guide');

    restyles.length=0;relayouts.length=0;
    const focus={type:'data.sweep',ref:ref(0,'B',1)};
    canonicalSubscriber({schema:2,revision:1,items:[focus],focus,ranges:[],context:{}},{reason:'test-core-source-scan'});
    heatmapSpec.options.onClick({points:[{x:.1,y:0}]});
    await tick();
    assert.strictEqual(pluginSelectCalls,0,'TER local heatmap callback must not overwrite Core canonical source-scan Selection');
    const opacityUpdate=restyles.find(row=>Array.isArray(row.patch?.opacity));
    assert(opacityUpdate,'canonical source scan must drive the real R–V isolation state');
    assert.deepStrictEqual(opacityUpdate.patch.opacity,[.035,.035,1,1,.035,.035],'only the selected Vg/source R–V pair may remain fully emphasized');
    assert.deepStrictEqual(opacityUpdate.patch['line.width'],[1.5,1.5,3.4,3.4,1.5,1.5],'selected forward/reverse curves must be widened together');
    const pointUpdates=restyles.filter(row=>row.indices?.length===1&&row.indices[0]>=6);
    assert(pointUpdates.some(row=>row.patch?.x?.[0]?.[0]===.1&&row.patch?.y?.[0]?.[0]===120),'heatmap click must restore the exact forward R–V marker');
    assert(pointUpdates.some(row=>row.patch?.x?.[0]?.[0]===.1&&row.patch?.y?.[0]?.[0]===240),'heatmap click must restore the exact reverse R–V marker');
    assert(relayouts.some(row=>row.shapes?.[0]?.x0===.1&&row.shapes?.[0]?.x1===.1),'exact Vds selection must also update the vertical guide');

    restyles.length=0;relayouts.length=0;
    const reverseFocus={type:'data.sweep',ref:ref(10,'C',-1)};
    canonicalSubscriber({schema:2,revision:2,items:[reverseFocus],focus:reverseFocus,ranges:[],context:{}},{reason:'test-rv-core-series'});
    resistanceSpec.spec.onClick({points:[{curveNumber:5,x:.2}]});
    await tick();
    const opacityFromRv=restyles.find(row=>Array.isArray(row.patch?.opacity));
    assert.deepStrictEqual(opacityFromRv.patch.opacity,[.035,.035,.035,.035,1,1],'R–V series Selection must isolate the selected source group through canonical Selection');
    assert(restyles.some(row=>row.patch?.x?.[0]?.[0]===.2&&row.patch?.y?.[0]?.[0]===150),'R–V click must retain its exact local Vds point after the Core series Selection');
    assert(restyles.some(row=>row.patch?.x?.[0]?.[0]===.2&&row.patch?.y?.[0]?.[0]===300),'R–V reverse/forward pair must share the exact selected Vds marker');

    mounted?.deactivate?.();
    assert.strictEqual(canonicalSubscriber,null,'TER feature disposal must release its canonical Selection subscription');
    console.log('v3.68.95 TER feature-runtime end-to-end heatmap↔R–V linking PASS');
  } finally {global.window=previousWindow;}
})().catch(err=>{console.error(err);process.exit(1);});
