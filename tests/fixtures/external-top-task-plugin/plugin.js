(() => {
  const manifest={
    id:'com.dkds.fixture.top-task',name:'External TOP Task Fixture',version:'1.0.0',apiVersion:'1.19.0',entry:'plugin.js',scripts:['plugin.js'],enabled:true,order:990,
    description:'Regression fixture for packaged TOP workbench task-source parity across owner and dedicated renderers.',pluginType:'workbench',
    requiresCore:['workspace','ui.activities','ui.pages','ui.top-workspace','execution.tasks'],capabilities:['ui.page','ui.top-workspace'],
    workspace:{role:'top',activity:'fixture-top-task',icon:'T',title:'TOP Task Fixture'},
    window:{activity:'fixture-top-task',title:'TOP Task Fixture',width:960,height:640,minWidth:720,minHeight:480,dependencies:[],prewarm:false,reuse:true,persistence:'memory'},
    data:{accepts:['data.table']},platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}},tasks:[{id:'fixture-task',entry:'task-entry.js',imports:['task-import.js']}]
  };
  DKDSPlugins.define(manifest,async ctx=>{
    const page=ctx.ui.pages.add({id:'fixture-page',pageId:'fixtureTopTaskPage',activity:'fixture-top-task',label:'TOP Task Fixture',title:'TOP Task Fixture',toolbar:false,html:'<div id="fixtureTopTaskRoot"></div>'});
    ctx.ui.activities.add({id:'fixture-top-task',label:'TOP Task Fixture',icon:'T',primary:true,openMode:'window',onActivate:()=>ctx.workspace.openPage(page.id)});
    ctx.ui.topWorkspace.register({id:'fixture-top-task',activity:'fixture-top-task',label:'TOP Task Fixture',icon:'T',layout:{mode:'native',root:{selector:'#fixtureTopTaskRoot'},primary:{id:'main',presentationRole:'utility-primary',priority:100,collapsible:false},prime:[],sub:[]}});
    globalThis.__DKDS_TOP_TASK_FIXTURE__=Object.freeze({tasks:ctx.tasks,pluginId:manifest.id});
    return {deactivate(){if(globalThis.__DKDS_TOP_TASK_FIXTURE__?.pluginId===manifest.id)globalThis.__DKDS_TOP_TASK_FIXTURE__=null;}};
  });
})();
