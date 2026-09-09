(() => {
  function attach(ctx,page){
    const body=page?.querySelector('.data-center-body'),left=page?.querySelector('.dc-artifact-pane'),main=page?.querySelector('.dc-main');
    if(!body||!left||!main)return null;
    left.remove();main.remove();body.replaceChildren();body.classList.add('dkds-unified-workbench-body');
    const host=ctx.ui.dom.create('div');host.className='dkds-plugin-workbench-root';body.appendChild(host);
    const wb=ctx.ui.workspaceSurface.create(host,{header:false,activity:'data-center',primaryScroll:'auto',leftWidth:320,leftMin:250,leftReserve:700,resizableRight:false,resizableBottom:false});
    wb.compose({
      primary:{id:'main',label:'数据中心',scroll:'auto',mainNode:main},
      primes:[{id:'data-control',label:'数据',title:'数据对象',semanticKind:'panel',presentationRole:'data-control',priority:94,collapsible:true,chrome:false,existingNode:left,autoOpen:true,defaultPlacement:'left',placements:['left','global','right','bottom'],stateVersion:'presentation-v1',mount:({container})=>container.classList.remove('hidden')}]
    });
    return wb;
  }
  window.DKDSPluginModules.define('builtin.data-center','mobile-presentation',Object.freeze({attach}));
})();
