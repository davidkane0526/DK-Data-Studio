'use strict';
const StyleGate=require('ui/style-ownership-gate');
const {LayoutUnitRuntime}=require('./unit-template-layout');
const {resolveElement,element,parentFor,appendResolvedMany,assignDataset,addClasses,markUnitRole,hasUnitRole}=require('./unit-template-common');
const {ACCEPTED_LAYOUT_BREAKPOINTS}=require('./unit-template-geometry-values');

const OWNER='core.unit-template.behavior';
const SOURCE='src/core/ui/modules/composition/unit-template-behavior.js';
const set=(node,property,value)=>StyleGate.set(node,property,String(value),{owner:OWNER,scope:'runtime-unit-behavior',source:SOURCE});
const remove=(node,property)=>StyleGate.remove(node,property,{owner:OWNER,scope:'runtime-unit-behavior',source:SOURCE});
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

class BehaviorUnitRuntime extends LayoutUnitRuntime {
  constructor(scope){super(scope);}

  bindMeter(target,spec={}){
    const node=element(target,'meter'),fill=resolveElement(spec.fill,node)||node.querySelector?.(':scope > span')||node.firstElementChild;
    if(!fill)throw new Error('UNIT_METER_FILL_REQUIRED');
    const min=Number.isFinite(Number(spec.min))?Number(spec.min):0,max=Number.isFinite(Number(spec.max))?Number(spec.max):100;
    if(!(max>min))throw new Error('UNIT_METER_RANGE_INVALID');
    markUnitRole(node,'meter','meter-v2',String(spec.variant||'thin'));node.setAttribute?.('role','progressbar');node.setAttribute?.('aria-valuemin',String(min));node.setAttribute?.('aria-valuemax',String(max));
    let value=min;
    const setValue=next=>{value=clamp(next,min,max);const ratio=(value-min)/(max-min),percent=Math.max(0,Math.min(100,ratio*100));set(fill,'width',`${percent}%`);node.setAttribute?.('aria-valuenow',String(value));if(spec.valueText!==undefined){const text=typeof spec.valueText==='function'?spec.valueText(value,percent):spec.valueText;node.setAttribute?.('aria-valuetext',String(text));}return value;};
    setValue(spec.value??min);this.scope.track?.(()=>remove(fill,'width'));
    return Object.freeze({element:node,fill,min,max,get value(){return value;},setValue});
  }
  createMeter(host,spec={}){
    const parent=parentFor(host,'meter host'),node=document.createElement(spec.tagName||'div');node.className='dkds-memory-meter';addClasses(node,spec.className);assignDataset(node,spec.dataset);const fill=document.createElement('span');node.appendChild(fill);parent?.appendChild(node);return this.bindMeter(node,{...spec,fill});
  }
  adoptMeter(target,spec={}){return this.bindMeter(target,spec);}

  bindMovableWindow(target,spec={}){
    const node=element(target,'movable-window'),handle=resolveElement(spec.handle,node)||node.querySelector?.('[data-dkds-unit-window-handle],.dkds-surface-header,.dkds-portable-header');
    if(!handle)throw new Error('UNIT_MOVABLE_WINDOW_HANDLE_REQUIRED');
    markUnitRole(node,'movable-window','movable-window-v2',String(spec.variant||'utility'));handle.dataset.dkdsUnitWindowHandle='true';
    const controller=this.scope.layout?.move?.({id:String(spec.id||'movable-window'),target:node,handle,bounds:spec.bounds||spec.container,persist:spec.persist!==false,resetOnDoubleClick:spec.resetOnDoubleClick!==false});
    if(!controller)throw new Error('UNIT_MOVABLE_WINDOW_RUNTIME_UNAVAILABLE');
    return Object.freeze({element:node,handle,controller,reset:options=>controller.reset?.(options),clamp:options=>controller.clamp?.(options),get position(){return Object.freeze({...controller.position});},dispose:()=>controller.dispose?.()});
  }
  createMovableWindow(host,spec={}){
    const parent=parentFor(host,'movable-window host'),node=document.createElement(spec.tagName||'section');node.className='dkds-dialog-shell';addClasses(node,spec.className);node.setAttribute?.('role',spec.role||'dialog');assignDataset(node,spec.dataset);
    let header=null,body=node;
    if(spec.header!==false){header=this.createHeader(node,{kind:'panel',variant:'panel',title:spec.title||'',meta:spec.meta,actions:spec.actions||[],actionHost:spec.actionHost,close:spec.close===true,className:spec.headerClassName});header.element.dataset.dkdsUnitWindowHandle='true';body=document.createElement('div');body.dataset.dkdsUnitMovableWindowBody='true';addClasses(body,spec.bodyClassName);node.appendChild(body);}
    if(spec.content)appendResolvedMany(body,spec.content);parent?.appendChild(node);const bound=this.bindMovableWindow(node,{...spec,handle:header?.element||spec.handle});return Object.freeze({...bound,header,body});
  }
  adoptMovableWindow(target,spec={}){return this.bindMovableWindow(target,spec);}

  bindSplitPane(spec={}){
    const container=element(spec.container,'split-pane container'),target=element(spec.target,'split-pane target'),handle=resolveElement(spec.handle,container);
    if(!handle)throw new Error('UNIT_SPLIT_PANE_HANDLE_REQUIRED');
    const axis=String(spec.axis||'y')==='x'?'x':'y',reverse=spec.reverse===true,token=String(spec.trackToken||'--dkds-unit-split-size');
    if(!/^--dkds-unit-[a-z0-9-]+$/.test(token))throw new Error(`UNIT_SPLIT_PANE_TOKEN_FORBIDDEN: ${token}`);
    const structuralTemplate=String(container.dataset?.dkdsUnitTemplate||''),hasLayout=structuralTemplate==='layout-v2'||hasUnitRole(container,'layout','layout-v2');
    const layoutOwner=String(spec.layoutOwner||'core');if(!['core','host'].includes(layoutOwner))throw new Error(`UNIT_SPLIT_PANE_LAYOUT_OWNER_FORBIDDEN: ${layoutOwner}`);
    if(layoutOwner==='host'&&!hasLayout)throw new Error('UNIT_SPLIT_PANE_HOST_LAYOUT_REQUIRES_LAYOUT_UNIT');
    if(structuralTemplate){container.dataset.dkdsUnitBehavior='split-pane-v2';container.dataset.dkdsUnitBehaviorVariant=String(spec.variant||'resizable');}else markUnitRole(container,'split-pane','split-pane-v2',String(spec.variant||'resizable'));container.dataset.dkdsUnitSplitAxis=axis;handle.dataset.dkdsUnitTemplate='split-handle-v2';handle.dataset.axis=axis==='y'?'y':'x';handle.setAttribute?.('role','separator');handle.setAttribute?.('aria-orientation',axis==='y'?'horizontal':'vertical');
    const reflowBelow=spec.reflowBelow===undefined||spec.reflowBelow===null?null:Number(spec.reflowBelow);if(reflowBelow!==null&&!ACCEPTED_LAYOUT_BREAKPOINTS.map(Number).includes(reflowBelow))throw new Error(`UNIT_SPLIT_PANE_BREAKPOINT_FORBIDDEN: ${reflowBelow}`);if(layoutOwner==='host'&&reflowBelow!==null)throw new Error('UNIT_SPLIT_PANE_HOST_LAYOUT_REFLOW_FORBIDDEN');
    container.dataset.dkdsUnitSplitLayoutOwner=layoutOwner;
    const gridTrack=reverse?`minmax(0,1fr) 8px var(${token})`:`var(${token}) 8px minmax(0,1fr)`;
    const applyLayout=()=>{if(layoutOwner!=='core')return;const width=Math.max(0,Number(container.clientWidth)||Number(container.parentElement?.clientWidth)||0),reflow=axis==='x'&&reflowBelow!==null&&width>0&&width<=reflowBelow;if(reflow){set(container,'display','flex');set(container,'flex-direction','column');set(container,'gap','8px');remove(container,'grid-template-rows');remove(container,'grid-template-columns');set(handle,'display','none');container.dataset.dkdsUnitSplitReflow='true';}else{set(container,'display','grid');remove(container,'flex-direction');remove(container,'gap');set(container,axis==='y'?'grid-template-rows':'grid-template-columns',gridTrack);remove(container,axis==='y'?'grid-template-columns':'grid-template-rows');remove(handle,'display');delete container.dataset.dkdsUnitSplitReflow;}set(container,'min-width','0');set(container,'min-height','0');};
    applyLayout();let ro=null;if(layoutOwner==='core'&&reflowBelow!==null&&globalThis.ResizeObserver){ro=new ResizeObserver(applyLayout);ro.observe(container);if(container.parentElement)ro.observe(container.parentElement);}
    const controller=this.scope.layout?.split?.({id:String(spec.id||'split-pane'),container,handle,target,axis,reverse,cssVar:token,defaultSize:Number(spec.defaultSize)||320,min:Number(spec.min)||180,max:spec.max??null,reserve:Number(spec.reserve)||0,mobileStateScope:spec.mobileStateScope===true});
    if(!controller)throw new Error('UNIT_SPLIT_PANE_RUNTIME_UNAVAILABLE');
    this.scope.track?.(()=>{try{ro?.disconnect?.();}catch{}if(layoutOwner==='core'){for(const property of ['display','flex-direction','gap','grid-template-rows','grid-template-columns','min-width','min-height'])remove(container,property);remove(handle,'display');delete container.dataset.dkdsUnitSplitReflow;}delete container.dataset.dkdsUnitSplitLayoutOwner;});
    return Object.freeze({element:container,container,target,handle,controller,setSize:(value,options)=>controller.apply?.(value,options),reset:()=>controller.apply?.(controller.state?.defaultSize??spec.defaultSize),collapse:(value,options)=>controller.setCollapsed?.(value,options),state:()=>controller.stateSnapshot?.(),dispose:()=>controller.dispose?.()});
  }
  createSplitPane(host,spec={}){
    const parent=element(host,'split-pane host'),container=document.createElement(spec.tagName||'div'),first=document.createElement('div'),second=document.createElement('div');container.dataset.dkdsUnitSplitPaneCreated='true';first.dataset.dkdsUnitSplitRegion='first';second.dataset.dkdsUnitSplitRegion='second';addClasses(container,spec.className);addClasses(first,spec.firstClassName);addClasses(second,spec.secondClassName);
    const regionProperties=Object.freeze({'display':'grid','grid-template-columns':'minmax(0,1fr)','grid-template-rows':'minmax(0,1fr)','min-width':'0','min-height':'0'});
    for(const region of [first,second])for(const [property,value] of Object.entries(regionProperties))set(region,property,value);
    this.scope.track?.(()=>{for(const region of [first,second])for(const property of Object.keys(regionProperties))remove(region,property);});
    const axis=String(spec.axis||'y')==='x'?'x':'y',handle=this.createSplitHandle(container,{axis:axis==='y'?'horizontal':'vertical',className:spec.handleClassName});
    // createSplitHandle appends immediately; reorder so the separator is always between the two regions.
    container.replaceChildren?.();container.append(first,handle,second);if(spec.first)appendResolvedMany(first,spec.first);if(spec.second)appendResolvedMany(second,spec.second);parent.appendChild(container);
    const resizeTarget=spec.resizeTarget==='second'?second:first;const reverse=spec.resizeTarget==='second'?true:spec.reverse===true;const bound=this.bindSplitPane({...spec,container,target:resizeTarget,handle,axis,reverse});return Object.freeze({...bound,first,second});
  }
  adoptSplitPane(spec={}){return this.bindSplitPane(spec);}
}
module.exports=Object.freeze({BehaviorUnitRuntime});
