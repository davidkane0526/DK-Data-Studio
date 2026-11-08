(() => {
 'use strict';
 // Mobile-only frame navigation. All 4 Frames stay in the DOM for DKDS plots.
 const strip=document.getElementById('fs-mobile-plot-tabs');
 const root=document.querySelector('.fs-frames');
 const tabs=[...strip.querySelectorAll('[data-frame-index]')];
 const frames=[...root.querySelectorAll('.fs-frame')];
 if(tabs.length!==4||frames.length!==4)throw Error('Four plot frames are required');
 const mobile=window.matchMedia('(max-width:650px)');
 let current=0,announced=-1;
 function select(index,{focus=false}={}){
  if(!Number.isInteger(index)||index<0||index>3)throw RangeError('Invalid plot frame index');
  const changed=index!==current;
  current=index;
  for(let i=0;i<4;i++){
   const chosen=i===current;
   tabs[i].setAttribute('aria-selected',String(chosen));
   tabs[i].tabIndex=chosen?0:-1;
   frames[i].dataset.mobileActive=String(chosen);
  }
  if(focus)tabs[current].focus({preventScroll:true});
  if(mobile.matches&&(changed||announced!==index)){
   announced=index;
   document.dispatchEvent(new CustomEvent('dkts:frame-selected',{detail:{index}}));
   requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
 }
 strip.addEventListener('click',event=>{
  const item=event.target.closest('button[data-frame-index]');
  if(item)select(Number(item.dataset.frameIndex));
 });
 strip.addEventListener('keydown',event=>{
  const keys=['ArrowRight','ArrowLeft','Home','End'];
  if(!keys.includes(event.key))return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?3:
   (current+(event.key==='ArrowRight'?1:3))%4;
  select(next,{focus:true});
 });
 function adapt(){
  if(mobile.matches){
   // Re-entering portrait changes the host dimensions for the chosen Frame.
   announced=-1;
   select(current);
  } else {
   // Previously hidden plot cards need their original traces re-rendered
   // after they become visible. Never fabricate a missing channel.
   for(let i=0;i<4;i++)frames[i].dataset.mobileActive=String(i===current);
   requestAnimationFrame(()=>{
    for(let i=0;i<3;i++)
     document.dispatchEvent(new CustomEvent('dkts:frame-selected',{detail:{index:i}}));
    window.dispatchEvent(new Event('resize'));
   });
  }
 }
 mobile.addEventListener?.('change',adapt);
 select(0);
 window.DK4200MobileFrames=Object.freeze({
  current:()=>current,select,visible:()=>mobile.matches
 });
})();
