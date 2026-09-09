'use strict';
const StyleGate=require('ui/style-ownership-gate');
const STYLE_SOURCE='src/core/ui/modules/scientific-curve/navigation.js';
const navSet=(el,property,value)=>StyleGate.set(el,property,value,{owner:'core.scientific-navigation',scope:'runtime-scientific-navigation',source:STYLE_SOURCE});
const navRemove=(el,property)=>StyleGate.remove(el,property,{owner:'core.scientific-navigation',scope:'runtime-scientific-navigation',source:STYLE_SOURCE});
const VISIBILITY_OWNER='core.scientific-curve-visibility';
const navPresentationSet=(el,attribute,value)=>StyleGate.setPresentation(el,attribute,value,{owner:VISIBILITY_OWNER,component:'scientific-marker-visibility',scope:'scientific-render',source:STYLE_SOURCE});
const navPresentationRemove=(el,attribute)=>StyleGate.removePresentation(el,attribute,{owner:VISIBILITY_OWNER,component:'scientific-marker-visibility',scope:'scientific-render',source:STYLE_SOURCE});
const selectionPresentation=(selection,attribute,value)=>{selection?.each?.(function(d,i,nodes){const next=typeof value==='function'?value.call(this,d,i,nodes):value;if(next===null||next===undefined||next==='')navPresentationRemove(this,attribute);else navPresentationSet(this,attribute,next);});return selection;};
const {hostState, readJson, writeJson}=require('../foundation/shortcuts');
const NativeTouchDrag=require('../../../host/native-touch-drag');

function applyScientificCurveNavigation(ScientificCurveSurface){
  class ScientificCurveNavigationMixin {
    navigationToolsStorageKey(){
      const targetId=String(this.target?.id||this.container?.id||this.target?.dataset?.dkdsScientificPlotId||'').trim();
      return targetId?`${hostState.storagePrefix}.scientific-nav.${this.owner}.${targetId}`:'';
    }
    navigationClampedPosition(x,y,hostRect,toolRect){
      const pad=4,maxX=Math.max(pad,hostRect.width-toolRect.width-pad),maxY=Math.max(pad,hostRect.height-toolRect.height-pad),clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||min));
      return {x:clamp(x,pad,maxX),y:clamp(y,pad,maxY)};
    }
    navigationSafePosition(x,y,hostRect,toolRect){
      const initial=this.navigationClampedPosition(x,y,hostRect,toolRect),obstacles=this.navigationToolObstacles?.()||[],pad=4,maxX=Math.max(pad,hostRect.width-toolRect.width-pad),maxY=Math.max(pad,hostRect.height-toolRect.height-pad),clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||min));
      const area=point=>{const candidate={left:hostRect.left+point.x,top:hostRect.top+point.y,right:hostRect.left+point.x+toolRect.width,bottom:hostRect.top+point.y+toolRect.height};let total=0;for(const row of obstacles){const r=row.rect,w=Math.max(0,Math.min(candidate.right,r.right)-Math.max(candidate.left,r.left)),h=Math.max(0,Math.min(candidate.bottom,r.bottom)-Math.max(candidate.top,r.top));total+=w*h;}return total;};
      if(area(initial)<=0)return initial;
      const candidates=[initial];for(const row of obstacles){const r=row.rect;candidates.push({x:initial.x,y:r.bottom-hostRect.top+6},{x:initial.x,y:r.top-hostRect.top-toolRect.height-6},{x:r.right-hostRect.left+6,y:initial.y},{x:r.left-hostRect.left-toolRect.width-6,y:initial.y});}
      const normalized=candidates.map(point=>({x:clamp(point.x,pad,maxX),y:clamp(point.y,pad,maxY)}));normalized.sort((a,b)=>area(a)-area(b)||Math.hypot(a.x-initial.x,a.y-initial.y)-Math.hypot(b.x-initial.x,b.y-initial.y));return normalized[0]||initial;
    }
    setNavigationToolsPosition(x,y,{persist=false,moved=true,avoidObstacles=true}={}){
      const tools=this.navTools,container=this.container;if(!tools||!container)return false;
      const hostRect=container.getBoundingClientRect(),toolRect=tools.getBoundingClientRect();
      if(!(hostRect.width>0&&hostRect.height>0&&toolRect.width>0&&toolRect.height>0))return false;
      const point=avoidObstacles?this.navigationSafePosition(x,y,hostRect,toolRect):this.navigationClampedPosition(x,y,hostRect,toolRect),nx=point.x,ny=point.y;
      navSet(tools,'left',`${Math.round(nx)}px`);navSet(tools,'top',`${Math.round(ny)}px`);navSet(tools,'right','auto');navSet(tools,'bottom','auto');if(moved)tools.dataset.moved='1';else delete tools.dataset.moved;
      if(persist){const key=this.navigationToolsStorageKey();if(key)writeJson(key,{x:nx,y:ny});}
      return true;
    }
    restoreNavigationToolsPosition(){
      const key=this.navigationToolsStorageKey();if(!key)return false;const saved=readJson(key,null);
      if(!saved||!Number.isFinite(Number(saved.x))||!Number.isFinite(Number(saved.y)))return false;
      requestAnimationFrame(()=>this.setNavigationToolsPosition(Number(saved.x),Number(saved.y)));return true;
    }
    resetNavigationToolsPosition(){
      const tools=this.navTools;if(!tools)return false;const key=this.navigationToolsStorageKey();if(key)try{localStorage.removeItem(key);}catch{}
      for(const prop of ['left','top','right','bottom'])navRemove(tools,prop);delete tools.dataset.moved;return true;
    }
    navigationToolObstacleSelectors(){
      return ['.dkds-plot-legend','[data-dkds-legend]','[data-dkds-floating-chrome]','.dkds-plot-view-head'];
    }
    navigationToolObstacles(){
      const container=this.container,tools=this.navTools;if(!container||!tools)return [];
      const hostRect=container.getBoundingClientRect(),selectors=this.navigationToolObstacleSelectors(),seen=new Set(),rows=[],root=container.closest?.('[data-dkds-plot-scope]')||container;
      for(const selector of selectors)for(const el of root.querySelectorAll?.(selector)||[]){if(!el||el===tools||seen.has(el)||el.closest?.('.dkds-scientific-nav-tools'))continue;seen.add(el);const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;const r=el.getBoundingClientRect();const left=Math.max(hostRect.left,r.left),right=Math.min(hostRect.right,r.right),top=Math.max(hostRect.top,r.top),bottom=Math.min(hostRect.bottom,r.bottom);if(right>left&&bottom>top)rows.push({el,rect:r});}
      return rows;
    }
    isNavigationObstacleNode(node){
      const el=node?.nodeType===1?node:node?.parentElement;if(!el?.closest)return false;
      return this.navigationToolObstacleSelectors().some(selector=>!!el.closest(selector));
    }
    scheduleNavigationCollisionCheck(){
      if(this.disposed||this.navCollisionFrame)return;this.navCollisionFrame=requestAnimationFrame(()=>{this.navCollisionFrame=0;if(!this.disposed)this.avoidNavigationToolCollisions();});
    }
    installNavigationObstacleObserver(){
      if(!window.MutationObserver||this.navObstacleObserver)return false;
      const root=this.container?.closest?.('[data-dkds-plot-scope],.dkds-surface,.card')||this.container?.parentElement||this.container;if(!root)return false;
      this.navObstacleObserver=new MutationObserver(records=>{for(const record of records){if(this.isNavigationObstacleNode(record.target)||[...(record.addedNodes||[])].some(node=>this.isNavigationObstacleNode(node))||[...(record.removedNodes||[])].some(node=>this.isNavigationObstacleNode(node))){this.scheduleNavigationCollisionCheck();break;}}});
      this.navObstacleObserver.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});return true;
    }
    avoidNavigationToolCollisions(){
      const tools=this.navTools,container=this.container;if(!tools||!container||tools.classList.contains('is-dragging'))return false;
      const host=container.getBoundingClientRect(),tr=tools.getBoundingClientRect();if(!(host.width>0&&host.height>0&&tr.width>0&&tr.height>0))return false;
      const obstacles=this.navigationToolObstacles(),userMoved=tools.dataset.moved==='1',margin=this.lastRender?.margin||{top:0,right:0,bottom:0,left:0},pad=8;
      const overlap=(x,y)=>{const candidate={left:host.left+x,top:host.top+y,right:host.left+x+tr.width,bottom:host.top+y+tr.height};let area=0;for(const row of obstacles){const r=row.rect,w=Math.max(0,Math.min(candidate.right,r.right)-Math.max(candidate.left,r.left)),h=Math.max(0,Math.min(candidate.bottom,r.bottom)-Math.max(candidate.top,r.top));area+=w*h;}return area;};
      const defaultPos={x:Math.max(pad,host.width-tr.width-pad),y:pad};
      const currentX=Number.parseFloat(tools.style.left),currentY=Number.parseFloat(tools.style.top),current={x:Number.isFinite(currentX)?currentX:defaultPos.x,y:Number.isFinite(currentY)?currentY:defaultPos.y};
      if(overlap(current.x,current.y)<=0){if(!userMoved&&Number.isFinite(currentX)&&overlap(defaultPos.x,defaultPos.y)<=0)this.resetNavigationToolsPosition();return false;}
      const rightX=Math.max(pad,host.width-tr.width-pad),leftX=Math.max(pad,Number(margin.left)||pad),bottomY=Math.max(pad,host.height-tr.height-Math.max(pad,Number(margin.bottom)||0)-pad),topY=Math.max(pad,Number(margin.top)>tr.height?Math.min(pad,Number(margin.top)-tr.height-pad):pad),candidates=[defaultPos,{x:rightX,y:bottomY},{x:leftX,y:topY},{x:leftX,y:bottomY}];
      for(const row of obstacles){const below=Math.max(pad,row.rect.bottom-host.top+6),above=Math.max(pad,row.rect.top-host.top-tr.height-6);candidates.push({x:rightX,y:below},{x:leftX,y:below},{x:rightX,y:above},{x:leftX,y:above});}
      const unique=[];const seen=new Set();for(const c of candidates){const x=Math.min(Math.max(pad,c.x),Math.max(pad,host.width-tr.width-pad)),y=Math.min(Math.max(pad,c.y),Math.max(pad,host.height-tr.height-pad)),key=`${Math.round(x)}:${Math.round(y)}`;if(!seen.has(key)){seen.add(key);unique.push({x,y});}}
      unique.sort((a,b)=>overlap(a.x,a.y)-overlap(b.x,b.y)||Math.hypot(a.x-current.x,a.y-current.y)-Math.hypot(b.x-current.x,b.y-current.y));const best=unique[0];if(!best)return false;return this.setNavigationToolsPosition(best.x,best.y,{persist:userMoved,moved:userMoved});
    }
    clampNavigationTools(){
      const tools=this.navTools;if(!tools)return false;
      const x=Number.parseFloat(tools.style.left),y=Number.parseFloat(tools.style.top);if(!Number.isFinite(x)||!Number.isFinite(y))return false;
      return this.setNavigationToolsPosition(x,y,{persist:false,moved:tools.dataset.moved==='1'});
    }
    installNavigationTools(){
      if(this.spec.navigationTools===false||this.navTools)return;
      const tools=document.createElement('div');tools.className='dkds-scientific-nav-tools dkds-integrated-action-group dkds-material-role-floating';tools.setAttribute('aria-label','图形操作');
      const drag=document.createElement('button');drag.type='button';drag.className='dkds-scientific-nav-drag';drag.dataset.dkdsComponentIdentity='toolbarAction';drag.dataset.dkdsComponentIdentityOwner='core-scientific-navigation';drag.dataset.dkdsComponentVariant='quiet';drag.dataset.dkdsComponentVariantOwner='core-scientific-navigation';drag.setAttribute('aria-label','拖动工具条；双击恢复默认位置');drag.textContent='⋮';tools.appendChild(drag);
      const rows=[['zoom-in','＋','放大'],['zoom-out','−','缩小'],['home','⌂','恢复全部数据']];
      for(const [action,label,title] of rows){const button=document.createElement('button');button.type='button';button.dataset.action=action;button.dataset.dkdsComponentIdentity='toolbarAction';button.dataset.dkdsComponentIdentityOwner='core-scientific-navigation';button.dataset.dkdsComponentVariant='quiet';button.dataset.dkdsComponentVariantOwner='core-scientific-navigation';button.textContent=label;button.setAttribute('aria-label',title);button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(action==='home')this.resetView({reason:'toolbar-home'});else this.zoomBy(action==='zoom-in'?0.72:1.38,{reason:`toolbar-${action}`});});tools.appendChild(button);}
      this.container.appendChild(tools);this.navTools=tools;
      const reveal=(delay=1600)=>{tools.classList.add('is-touch-visible');clearTimeout(this.navTouchHideTimer);this.navTouchHideTimer=setTimeout(()=>{if(!tools.classList.contains('is-dragging'))tools.classList.remove('is-touch-visible');},Math.max(500,Number(delay)||1600));};
      this.navTouchRevealHandler=event=>{if(event.pointerType&&event.pointerType!=='mouse')reveal();};
      this.container.addEventListener('pointerdown',this.navTouchRevealHandler,true);
      if(document.documentElement?.classList?.contains('react-native-client'))reveal(1100);
      const nativeClient=document.documentElement?.classList?.contains('react-native-client')===true;
      let dragState=null,dragFrame=0,latestPoint=null;
      const rawPoint=event=>{const clientX=Number(event?.clientX),clientY=Number(event?.clientY);return Number.isFinite(clientX)&&Number.isFinite(clientY)?{clientX,clientY}:null;};
      const pointerPoint=event=>{
        if(!nativeClient){const rows=event.getCoalescedEvents?.(),point=rows?.length?rows[rows.length-1]:event;return rawPoint(point)||rawPoint(event);}
        const point=rawPoint(event);if(!point)return null;
        if(point.clientX<=1&&point.clientY<=1&&dragState&&(dragState.startClientX>12||dragState.startClientY>12))return null;
        return point;
      };
      const applyDrag=()=>{
        dragFrame=0;if(!dragState||!latestPoint)return;
        if(dragState.native){
          this.setNavigationToolsPosition(dragState.startX+(latestPoint.clientX-dragState.startClientX),dragState.startY+(latestPoint.clientY-dragState.startClientY),{avoidObstacles:false});return;
        }
        const hostRect=this.container.getBoundingClientRect();this.setNavigationToolsPosition(latestPoint.clientX-hostRect.left-dragState.offsetX,latestPoint.clientY-hostRect.top-dragState.offsetY,{avoidObstacles:false});
      };
      const queueDragPoint=point=>{if(!dragState||!point)return;latestPoint=point;if(!dragFrame)dragFrame=requestAnimationFrame(applyDrag);};
      const startDrag=(point,{pointerId=null,native=false,input='pointer'}={})=>{
        if(!point||dragState)return false;
        const toolRect=tools.getBoundingClientRect(),hostRect=this.container.getBoundingClientRect();
        dragState=native?{pointerId,native:true,input,startClientX:point.clientX,startClientY:point.clientY,startX:toolRect.left-hostRect.left,startY:toolRect.top-hostRect.top}:{pointerId,native:false,input,offsetX:point.clientX-toolRect.left,offsetY:point.clientY-toolRect.top};
        latestPoint=point;clearTimeout(this.navTouchHideTimer);tools.classList.add('is-dragging','is-touch-visible');return true;
      };
      const persistDrag=()=>{const x=Number.parseFloat(tools.style.left),y=Number.parseFloat(tools.style.top);if(Number.isFinite(x)&&Number.isFinite(y))this.setNavigationToolsPosition(x,y,{persist:true});reveal(1200);this.scheduleNavigationCollisionCheck();};
      const completeDrag=point=>{
        if(!dragState)return;if(point)latestPoint=point;if(dragFrame){cancelAnimationFrame(dragFrame);dragFrame=0;}applyDrag();
        dragState=null;latestPoint=null;tools.classList.remove('is-dragging');persistDrag();
      };
      const trackPointer=event=>{if(!dragState||dragState.input!=='pointer'||event.pointerId!==dragState.pointerId)return;if(event.cancelable)event.preventDefault();const point=pointerPoint(event);if(point)queueDragPoint(point);};
      const detachPointerTracking=()=>{window.removeEventListener('pointermove',trackPointer,true);window.removeEventListener('pointerup',finishPointer,true);window.removeEventListener('pointercancel',finishPointer,true);};
      const finishPointer=event=>{if(!dragState||dragState.input!=='pointer'||event.pointerId!==dragState.pointerId)return;const point=pointerPoint(event),pointerId=dragState.pointerId;detachPointerTracking();completeDrag(point);try{drag.releasePointerCapture(pointerId);}catch{}};
      drag.addEventListener('pointerdown',event=>{
        if(event.button!==0||(nativeClient&&event.pointerType==='touch'))return;event.preventDefault();event.stopPropagation();
        const point=rawPoint(event);if(!point||!startDrag(point,{pointerId:event.pointerId,native:nativeClient,input:'pointer'}))return;
        if(nativeClient){window.addEventListener('pointermove',trackPointer,{capture:true,passive:false});window.addEventListener('pointerup',finishPointer,true);window.addEventListener('pointercancel',finishPointer,true);}
        else try{drag.setPointerCapture(event.pointerId);}catch{}
      });
      if(!nativeClient){drag.addEventListener('pointermove',trackPointer);drag.addEventListener('pointerup',finishPointer);drag.addEventListener('pointercancel',finishPointer);}
      const unbindNativeTouch=nativeClient?NativeTouchDrag.bind(drag,{
        onStart:point=>{if(!startDrag(point,{native:true,input:'touch'}))return false;return true;},
        onMove:point=>queueDragPoint(point),
        onEnd:point=>completeDrag(point),
        onCancel:point=>completeDrag(point)
      }):()=>{};
      this.navTouchDragCleanup=unbindNativeTouch;
      drag.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();this.resetNavigationToolsPosition();});
      drag.addEventListener('keydown',event=>{if(event.key==='Home'||event.key==='Escape'){event.preventDefault();this.resetNavigationToolsPosition();}});
      this.restoreNavigationToolsPosition();this.scheduleNavigationCollisionCheck();
    }
    zoomBy(factor,meta={}){
      const last=this.lastRender;if(!last)return false;const xd=last.x.domain(),yd=last.y.domain(),cx=(xd[0]+xd[1])/2,logY=this.displayYAxisType==='log',cy=logY?Math.sqrt(Number(yd[0])*Number(yd[1])):(yd[0]+yd[1])/2;
      this.setView({xDomain:this.scaleDomainAround(xd,cx,Number(factor)||1),yDomain:this.scaleDomainAround(yd,cy,Number(factor)||1,logY?1e-6:1e-12,logY?'log':'linear')},{reason:'toolbar-zoom',...meta});this.requestRender('toolbar-zoom');return true;
    }
    scaleDomainAround(domain,center,factor,minSpan=1e-12,mode='linear'){
      const values=Array.isArray(domain)?domain.map(Number):[];const c=Number(center),f=Number(factor);if(values.length!==2||!values.every(Number.isFinite)||!Number.isFinite(c)||!Number.isFinite(f)||f<=0)return Array.isArray(domain)?domain.slice():domain;
      if(mode==='log'){
        if(values.some(value=>value<=0)||c<=0)return values.slice();
        const logs=values.map(value=>Math.log10(value)),lc=Math.log10(c),lo=lc+(logs[0]-lc)*f,hi=lc+(logs[1]-lc)*f;
        return Number.isFinite(lo)&&Number.isFinite(hi)&&Math.abs(hi-lo)>=Math.max(1e-9,Number(minSpan)||0)?[Math.pow(10,lo),Math.pow(10,hi)]:values.slice();
      }
      const lo=c+(values[0]-c)*f,hi=c+(values[1]-c)*f;return Number.isFinite(lo)&&Number.isFinite(hi)&&Math.abs(hi-lo)>=minSpan?[lo,hi]:values.slice();
    }
    symbolType(shape,d3){return ({circle:d3.symbolCircle,diamond:d3.symbolDiamond,triangle:d3.symbolTriangle,square:d3.symbolSquare,cross:d3.symbolCross,star:d3.symbolStar})[String(shape||'circle')]||d3.symbolCircle;}
    requestRender(reason='request'){if(this.disposed||this.renderQueued)return;this.renderQueued=true;requestAnimationFrame(()=>{this.renderQueued=false;if(!this.disposed)this.render(reason);});}
    fitToData(meta={}){this.setView({xDomain:null,yDomain:null},{reason:'fit-data',...meta});this.spec.onFit?.(meta);this.requestRender('fit-data');return true;}
    resetView(meta={}){this.setView({xDomain:null,yDomain:null},{reason:'reset',...meta});this.spec.onReset?.(meta);this.requestRender('reset');return true;}
    updateMarkerVisual(marker,point){
      const last=this.lastRender;if(!last||!marker||!point)return false;const id=String(marker.id),xv=Number(point.x??point.v),yv=Number(point.y??point.i);if(!Number.isFinite(xv)||!Number.isFinite(yv))return false;
      marker.x=xv;marker.y=yv;const {dataLayer,x,y}=last;if(!dataLayer||!x||!y)return false;
      const nodes=last.markerNodes?.get?.(id),visible=this.yDisplayable(yv);
      if(nodes?.halo){visible?navRemove(nodes.halo,'display'):navSet(nodes.halo,'display','none');if(visible)nodes.halo.setAttribute('transform',`translate(${x(xv)},${y(this.yDisplayValue(yv))})`);}
      if(nodes?.mark){visible?navPresentationRemove(nodes.mark,'display'):navPresentationSet(nodes.mark,'display','none');if(visible)nodes.mark.setAttribute('transform',`translate(${x(xv)},${y(this.yDisplayValue(yv))})`);}else dataLayer.selectAll('path.dkds-scientific-marker').filter(d=>String(d?.id)===id).call(selectionPresentation,'display',visible?null:'none').attr('transform',visible?`translate(${x(xv)},${y(this.yDisplayValue(yv))})`:null);
      if(nodes?.hit){visible?navPresentationRemove(nodes.hit,'display'):navPresentationSet(nodes.hit,'display','none');if(visible){nodes.hit.setAttribute('cx',String(x(xv)));nodes.hit.setAttribute('cy',String(y(this.yDisplayValue(yv))));}}else dataLayer.selectAll('circle.dkds-scientific-marker-hit').filter(d=>String(d?.id)===id).call(selectionPresentation,'display',visible?null:'none').attr('cx',visible?x(xv):null).attr('cy',visible?y(yv):null);
      return true;
    }
    nearestCurveAtPixel(px,py,x,y,curves,maxDistancePx=18){
      let best=null;
      for(const curve of curves){const points=this.normalizedPoints(curve);if(!points.length)continue;const idx=this.nearestIndex(points,x.invert(px));for(let j=Math.max(0,idx-2);j<=Math.min(points.length-1,idx+2);j++){const p=points[j];if(!this.yDisplayable(p.y))continue;const dx=x(p.x)-px,dy=y(this.yDisplayValue(p.y))-py,dist=Math.hypot(dx,dy);if(!best||dist<best.distance)best={curve,point:p,index:Number.isFinite(Number(p.sourceIndex))?Number(p.sourceIndex):j,distance:dist};}}
      return best&&best.distance<=maxDistancePx?best:null;
    }

  }
  for(const name of Object.getOwnPropertyNames(ScientificCurveNavigationMixin.prototype)){
    if(name==='constructor')continue;
    Object.defineProperty(ScientificCurveSurface.prototype,name,Object.getOwnPropertyDescriptor(ScientificCurveNavigationMixin.prototype,name));
  }
  return ScientificCurveSurface;
}
module.exports=Object.freeze({applyScientificCurveNavigation});
