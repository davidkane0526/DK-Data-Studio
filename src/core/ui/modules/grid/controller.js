'use strict';
const {resolveElement}=require('../foundation/shortcuts');
const StyleGate=require('ui/style-ownership-gate');
const GRID_STYLE_OWNER='core.grid-controller';
const STYLE_SOURCE='src/core/ui/modules/grid/controller.js';
const gridSet=(el,property,value)=>StyleGate.set(el,property,value,{owner:GRID_STYLE_OWNER,scope:'runtime-grid',source:STYLE_SOURCE});
const gridToken=(el,property,value)=>StyleGate.setToken(el,property,value,{owner:GRID_STYLE_OWNER,scope:'runtime-grid-token',source:STYLE_SOURCE});
const gridRemove=(el,property)=>StyleGate.remove(el,property,{owner:GRID_STYLE_OWNER,scope:property.startsWith('--')?'runtime-grid-token':'runtime-grid',source:STYLE_SOURCE});

class GridController {
  constructor(scope,container,spec={}){
    this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.columns=Math.max(1,Number(spec.columns)||3);this.minItemWidth=Math.max(180,Number(spec.minItemWidth)||320);this.maxColumns=Math.max(this.columns,Number(spec.maxColumns)||6);this.ro=null;this.membershipObserver=null;this.appliedColumns=0;this.lastLandscapeColumns=0;this.lastApplyKey='';this.placedChildren=new Set();this.stickyRail=null;
    if(!this.container)throw new Error('GridController container not found.');
    this.container.classList.add('dkds-managed-grid');
    this.container.__dkdsGridController=this;
    this.apply();
    if(window.MutationObserver){
      this.membershipObserver=new MutationObserver(records=>{
        if(records.some(record=>record.type==='childList'?record.target===this.container:record.target.parentNode===this.container))this.apply();
      });
      this.membershipObserver.observe(this.container,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    }
    if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.apply());this.ro.observe(this.container);}
  }
  directChildren(){return [...this.container.children].filter(node=>node?.nodeType===1&&node!==this.stickyRail&&!node.classList?.contains('dkds-grid-sticky-rail'));}
  railChildren(){return this.stickyRail?.isConnected?[...this.stickyRail.children].filter(node=>node?.nodeType===1):[];}
  allManagedChildren(){return [...this.directChildren(),...this.railChildren()];}

  isNativeMobileHost(){
    const root=globalThis.document?.documentElement;
    return root?.dataset?.dkdsHost==='mobile'&&root.classList?.contains('react-native-client');
  }
  orientation(){
    if(!this.isNativeMobileHost())return 'landscape';
    const w=Math.max(0,Number(globalThis.innerWidth)||0),h=Math.max(0,Number(globalThis.innerHeight)||0);
    return h>w?'portrait':'landscape';
  }
  orientationPolicy(){
    const policy=this.spec.orientationPolicy;
    if(!policy||typeof policy!=='object'||String(policy.mode||'')!=='portrait-offset')return null;
    const offset=Number.isFinite(Number(policy.offset))?Number(policy.offset):-1;
    const minColumns=Math.max(1,Math.min(this.maxColumns,Number(policy.minColumns)||1));
    return {mode:'portrait-offset',offset,minColumns};
  }
  preferenceFor(orientation=this.orientation()){
    if(typeof this.spec.preferredColumns!=='function')return null;
    try{
      const raw=this.spec.preferredColumns({orientation,width:Math.max(0,this.container.clientWidth||0),columns:this.columns,maxColumns:this.maxColumns,minItemWidth:this.minItemWidth,container:this.container,controller:this});
      if(raw===null||raw===undefined||String(raw)==='auto')return null;
      const value=Number(raw);return Number.isFinite(value)&&value>0?Math.max(1,Math.min(this.maxColumns,value)):null;
    }catch{return null;}
  }
  estimatedColumns(width,limit=this.columns){
    const value=Math.floor((Math.max(0,Number(width)||0)+10)/(this.minItemWidth+10))||1;
    return Math.max(1,Math.min(Math.max(1,Number(limit)||1),this.maxColumns,value));
  }
  preferredColumns(width=Math.max(0,this.container.clientWidth||0)){
    const orientation=this.orientation(),explicit=this.preferenceFor(orientation);
    if(explicit!==null)return explicit;
    const policy=this.orientationPolicy();
    if(orientation==='portrait'&&policy){
      const landscapeExplicit=this.preferenceFor('landscape');
      const referenceWidth=Math.max(width,Number(globalThis.innerWidth)||0,Number(globalThis.innerHeight)||0);
      const base=this.lastLandscapeColumns>0?this.lastLandscapeColumns:(landscapeExplicit!==null?landscapeExplicit:this.estimatedColumns(referenceWidth,this.columns));
      return Math.max(policy.minColumns,Math.min(this.maxColumns,base+policy.offset));
    }
    return this.columns;
  }
  responsiveColumns(){
    const width=Math.max(0,this.container.clientWidth||0);
    const desired=this.preferredColumns(width);
    if(this.spec.responsive===false)return desired;
    if(!width)return desired;
    return Math.max(1,Math.min(desired,this.maxColumns,this.estimatedColumns(width,this.maxColumns)));
  }
  applyKey(orientation,cols){
    const width=Math.round(Math.max(0,Number(this.container.clientWidth)||0)*2)/2;
    const children=this.allManagedChildren().map((node,index)=>{
      const id=String(node?.dataset?.groupMetric||node?.dataset?.dkdsPlotViewId||node?.id||index);
      const hidden=node?.hidden||node?.classList?.contains('hidden')||node?.classList?.contains('dkds-prime-hidden')?1:0;
      const sticky=node?.classList?.contains('is-sticky')?1:0;
      return `${id}:${hidden}:${sticky}`;
    }).join('|');
    return `${orientation}:${cols}:${width}:${children}`;
  }
  clearAvoidanceStyles(children=this.allManagedChildren()){
    for(const child of new Set([...this.placedChildren,...children])){
      if(child.dataset?.dkdsGridAvoidance==='1'){
        gridRemove(child,'grid-column');gridRemove(child,'grid-row');delete child.dataset.dkdsGridAvoidance;
      }
    }
    this.placedChildren.clear();
  }
  ensureStickyRail(anchor,cols){
    let rail=this.stickyRail;
    if(!rail?.isConnected){
      const doc=this.container.ownerDocument||globalThis.document;
      if(!doc?.createElement)return null;
      rail=doc.createElement('div');rail.className='dkds-grid-sticky-rail';rail.dataset.dkdsGridStickyRail='1';this.container.appendChild(rail);this.stickyRail=rail;
    }
    const style=globalThis.getComputedStyle?.(this.container);
    const gap=Math.max(0,parseFloat(style?.columnGap||style?.gap)||0);
    const width=Math.max(0,((Number(this.container.clientWidth)||0)-gap*Math.max(0,cols-1))/Math.max(1,cols));
    if(width>0)gridToken(this.container,'--dkds-grid-sticky-rail-width',`${width}px`);
    if(anchor.parentElement!==rail)rail.appendChild(anchor);
    return rail;
  }
  releaseStickyRail(){
    const rail=this.stickyRail;
    if(!rail)return;
    for(const child of [...rail.children])this.container.insertBefore(child,rail);
    rail.remove();this.stickyRail=null;gridRemove(this.container,'--dkds-grid-sticky-rail-width');
  }
  applyStickyAvoidance(cols){
    let allChildren=this.allManagedChildren();
    const children=allChildren.filter(node=>!node.hidden&&!node.classList.contains('hidden')&&!node.classList.contains('dkds-prime-hidden'));
    this.clearAvoidanceStyles(allChildren);
    this.container.classList.remove('dkds-grid-sticky-avoidance','dkds-grid-sticky-disabled');
    const sticky=children.filter(child=>child.classList?.contains('is-sticky'));
    if(!sticky.length){this.releaseStickyRail();return;}
    if(cols<2){this.releaseStickyRail();this.container.classList.add('dkds-grid-sticky-disabled');return;}

    // A sticky group child must not participate in CSS Grid track sizing. Keeping
    // a viewport-height sticky card as a normal grid item stretches its row and
    // moves every sibling plot's Y geometry. Move only the sticky child into an
    // out-of-flow rail that reserves the last visual column while siblings remain
    // in the original grid rows. Returning home moves it back through PortableView.
    const anchor=sticky[0],anchorCol=cols,available=[];
    const rail=this.ensureStickyRail(anchor,cols);
    allChildren=this.allManagedChildren();
    const directVisible=this.directChildren().filter(node=>!node.hidden&&!node.classList.contains('hidden')&&!node.classList.contains('dkds-prime-hidden'));
    this.placedChildren=new Set([...directVisible,anchor]);
    for(let col=1;col<=cols;col++)if(col!==anchorCol)available.push(col);
    let index=0;
    for(const child of directVisible){const col=available[index%available.length],row=Math.floor(index/available.length)+1;gridSet(child,'grid-column',String(col));gridSet(child,'grid-row',String(row));child.dataset.dkdsGridAvoidance='1';index++;}
    // A DOM-less harness cannot create the out-of-flow rail. Keep a graceful
    // fallback for tests/non-browser embeddings, but browsers always take the
    // rail path above so the sticky card never participates in row sizing.
    if(!rail){gridSet(anchor,'grid-column',String(anchorCol));gridSet(anchor,'grid-row','1');}
    anchor.dataset.dkdsGridAvoidance='1';this.container.classList.add('dkds-grid-sticky-avoidance');
  }
  apply(){
    const orientation=this.orientation(),cols=this.responsiveColumns(),changed=cols!==this.appliedColumns;this.appliedColumns=cols;if(orientation==='landscape')this.lastLandscapeColumns=cols;
    const key=this.applyKey(orientation,cols);if(key===this.lastApplyKey)return cols;this.lastApplyKey=key;
    gridToken(this.container,'--dkds-grid-columns',String(cols));
    this.container.dataset.dkdsGridColumns=String(cols);this.applyStickyAvoidance(cols);
    // DOM movement into/out of the sticky rail changes the structural key once.
    // Record the settled key so the observer callback caused by our own move is a no-op.
    this.lastApplyKey=this.applyKey(orientation,cols);
    if(changed)this.scope.emitResize?.({reason:'grid',columns:cols});else this.scope.requestChartResize?.({reason:'grid-observer',columns:cols});return cols;
  }
  setColumns(value){this.columns=Math.max(1,Math.min(this.maxColumns,Number(value)||1));this.apply();return this.columns;}
  getColumns(){return this.columns;}
  getAppliedColumns(){return Math.max(1,Number(this.appliedColumns)||1);}
  getOrientation(){return this.orientation();}
  dispose(){
    this.ro?.disconnect?.();this.membershipObserver?.disconnect?.();if(this.container.__dkdsGridController===this)delete this.container.__dkdsGridController;
    this.lastApplyKey='';this.clearAvoidanceStyles();this.releaseStickyRail();this.container.classList.remove('dkds-managed-grid','dkds-group-area-grid','dkds-grid-sticky-avoidance','dkds-grid-sticky-disabled');gridRemove(this.container,'--dkds-grid-columns');delete this.container.dataset.dkdsGridColumns;delete this.container.dataset.dkdsGroupArea;
  }
}

class GroupAreaController extends GridController {
  constructor(scope,container,spec={}){
    super(scope,container,spec);
    this.container.classList.add('dkds-group-area-grid');
    this.container.dataset.dkdsGroupArea='true';
    this.lastApplyKey='';
    this.apply();
  }
  get kind(){return 'group-area';}
}

module.exports=Object.freeze({GridController,GroupAreaController});
