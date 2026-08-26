'use strict';
const {hostState, readJson, writeJson}=require('../foundation/shortcuts');

function applyScientificCurveNavigation(ScientificCurveSurface){
  class ScientificCurveNavigationMixin {
    navigationToolsStorageKey(){
      const targetId=String(this.target?.id||this.container?.id||this.target?.dataset?.dkdsScientificPlotId||'').trim();
      return targetId?`${hostState.storagePrefix}.scientific-nav.${this.owner}.${targetId}`:'';
    }
    setNavigationToolsPosition(x,y,{persist=false,moved=true}={}){
      const tools=this.navTools,container=this.container;if(!tools||!container)return false;
      const hostRect=container.getBoundingClientRect(),toolRect=tools.getBoundingClientRect();
      if(!(hostRect.width>0&&hostRect.height>0&&toolRect.width>0&&toolRect.height>0))return false;
      const pad=4,maxX=Math.max(pad,hostRect.width-toolRect.width-pad),maxY=Math.max(pad,hostRect.height-toolRect.height-pad);
      const nx=Math.min(maxX,Math.max(pad,Number(x)||pad)),ny=Math.min(maxY,Math.max(pad,Number(y)||pad));
      tools.style.left=`${Math.round(nx)}px`;tools.style.top=`${Math.round(ny)}px`;tools.style.right='auto';tools.style.bottom='auto';if(moved)tools.dataset.moved='1';else delete tools.dataset.moved;
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
      for(const prop of ['left','top','right','bottom'])tools.style.removeProperty(prop);delete tools.dataset.moved;return true;
    }
    navigationToolObstacles(){
      const container=this.container,tools=this.navTools;if(!container||!tools)return [];
      const hostRect=container.getBoundingClientRect(),selectors=['.dkds-plot-legend','[data-dkds-legend]'],seen=new Set(),rows=[];
      for(const selector of selectors)for(const el of document.querySelectorAll(selector)){if(!el||el===tools||seen.has(el)||el.closest?.('.dkds-scientific-nav-tools'))continue;seen.add(el);const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;const r=el.getBoundingClientRect();const left=Math.max(hostRect.left,r.left),right=Math.min(hostRect.right,r.right),top=Math.max(hostRect.top,r.top),bottom=Math.min(hostRect.bottom,r.bottom);if(right>left&&bottom>top)rows.push({el,rect:r});}
      return rows;
    }
    isNavigationLegendNode(node){
      const el=node?.nodeType===1?node:node?.parentElement;if(!el?.closest)return false;
      return !!el.closest('.dkds-plot-legend,[data-dkds-legend]');
    }
    scheduleNavigationCollisionCheck(){
      if(this.disposed||this.navCollisionFrame)return;this.navCollisionFrame=requestAnimationFrame(()=>{this.navCollisionFrame=0;if(!this.disposed)this.avoidNavigationToolCollisions();});
    }
    installNavigationObstacleObserver(){
      if(!window.MutationObserver||this.navObstacleObserver)return false;
      const root=this.container?.closest?.('[data-dkds-plot-scope],.dkds-workbench,.dkds-surface,.card')||this.container?.parentElement||this.container;if(!root)return false;
      this.navObstacleObserver=new MutationObserver(records=>{for(const record of records){if(this.isNavigationLegendNode(record.target)||[...(record.addedNodes||[])].some(node=>this.isNavigationLegendNode(node))||[...(record.removedNodes||[])].some(node=>this.isNavigationLegendNode(node))){this.scheduleNavigationCollisionCheck();break;}}});
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
      const drag=document.createElement('span');drag.className='dkds-scientific-nav-drag';drag.setAttribute('role','button');drag.setAttribute('tabindex','0');drag.setAttribute('aria-label','拖动图形工具条');drag.title='拖动工具条；双击恢复默认位置';drag.textContent='⋮';tools.appendChild(drag);
      const rows=[['zoom-in','＋','放大'],['zoom-out','−','缩小'],['home','⌂','恢复全部数据']];
      for(const [action,label,title] of rows){const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=label;button.title=title;button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(action==='home')this.resetView({reason:'toolbar-home'});else this.zoomBy(action==='zoom-in'?0.72:1.38,{reason:`toolbar-${action}`});});tools.appendChild(button);}
      this.container.appendChild(tools);this.navTools=tools;
      let dragState=null;
      drag.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;event.preventDefault();event.stopPropagation();
        const hostRect=this.container.getBoundingClientRect(),toolRect=tools.getBoundingClientRect();
        dragState={pointerId:event.pointerId,startClientX:event.clientX,startClientY:event.clientY,startX:toolRect.left-hostRect.left,startY:toolRect.top-hostRect.top};
        tools.classList.add('is-dragging');try{drag.setPointerCapture(event.pointerId);}catch{}
      });
      drag.addEventListener('pointermove',event=>{if(!dragState||event.pointerId!==dragState.pointerId)return;event.preventDefault();this.setNavigationToolsPosition(dragState.startX+event.clientX-dragState.startClientX,dragState.startY+event.clientY-dragState.startClientY);});
      const finishDrag=event=>{if(!dragState||event.pointerId!==dragState.pointerId)return;const pointerId=dragState.pointerId;dragState=null;tools.classList.remove('is-dragging');try{drag.releasePointerCapture(pointerId);}catch{}const x=Number.parseFloat(tools.style.left),y=Number.parseFloat(tools.style.top);if(Number.isFinite(x)&&Number.isFinite(y))this.setNavigationToolsPosition(x,y,{persist:true});this.scheduleNavigationCollisionCheck();};
      drag.addEventListener('pointerup',finishDrag);drag.addEventListener('pointercancel',finishDrag);
      drag.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();this.resetNavigationToolsPosition();});
      drag.addEventListener('keydown',event=>{if(event.key==='Home'||event.key==='Escape'){event.preventDefault();this.resetNavigationToolsPosition();}});
      this.restoreNavigationToolsPosition();this.scheduleNavigationCollisionCheck();
    }
    zoomBy(factor,meta={}){
      const last=this.lastRender;if(!last)return false;const xd=last.x.domain(),yd=last.y.domain(),cx=(xd[0]+xd[1])/2,cy=(yd[0]+yd[1])/2;
      this.setView({xDomain:this.scaleDomainAround(xd,cx,Number(factor)||1),yDomain:this.scaleDomainAround(yd,cy,Number(factor)||1)},{reason:'toolbar-zoom',...meta});this.requestRender('toolbar-zoom');return true;
    }
    scaleDomainAround(domain,center,factor,minSpan=1e-12){const lo=center+(domain[0]-center)*factor,hi=center+(domain[1]-center)*factor;return Number.isFinite(lo)&&Number.isFinite(hi)&&Math.abs(hi-lo)>=minSpan?[lo,hi]:domain.slice();}
    symbolType(shape,d3){return ({circle:d3.symbolCircle,diamond:d3.symbolDiamond,triangle:d3.symbolTriangle,square:d3.symbolSquare,cross:d3.symbolCross,star:d3.symbolStar})[String(shape||'circle')]||d3.symbolCircle;}
    requestRender(reason='request'){if(this.disposed||this.renderQueued)return;this.renderQueued=true;requestAnimationFrame(()=>{this.renderQueued=false;if(!this.disposed)this.render(reason);});}
    fitToData(meta={}){this.setView({xDomain:null,yDomain:null},{reason:'fit-data',...meta});this.spec.onFit?.(meta);this.requestRender('fit-data');return true;}
    resetView(meta={}){this.setView({xDomain:null,yDomain:null},{reason:'reset',...meta});this.spec.onReset?.(meta);this.requestRender('reset');return true;}
    updateMarkerVisual(marker,point){
      const last=this.lastRender;if(!last||!marker||!point)return false;const id=String(marker.id),xv=Number(point.x??point.v),yv=Number(point.y??point.i);if(!Number.isFinite(xv)||!Number.isFinite(yv))return false;
      marker.x=xv;marker.y=yv;const {dataLayer,x,y}=last;if(!dataLayer||!x||!y)return false;
      const nodes=last.markerNodes?.get?.(id),visible=this.yDisplayable(yv);
      if(nodes?.mark){nodes.mark.style.display=visible?'':'none';if(visible)nodes.mark.setAttribute('transform',`translate(${x(xv)},${y(this.yDisplayValue(yv))})`);}else dataLayer.selectAll('path.dkds-scientific-marker').filter(d=>String(d?.id)===id).style('display',visible?null:'none').attr('transform',visible?`translate(${x(xv)},${y(this.yDisplayValue(yv))})`:null);
      if(nodes?.hit){nodes.hit.style.display=visible?'':'none';if(visible){nodes.hit.setAttribute('cx',String(x(xv)));nodes.hit.setAttribute('cy',String(y(this.yDisplayValue(yv))));}}else dataLayer.selectAll('circle.dkds-scientific-marker-hit').filter(d=>String(d?.id)===id).style('display',visible?null:'none').attr('cx',visible?x(xv):null).attr('cy',visible?y(yv):null);
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
