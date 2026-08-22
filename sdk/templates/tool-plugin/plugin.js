(() => {
  const manifest={
    id:'com.example.tool-workspace',name:'SDK Tool Workspace Example',version:'1.0.0',apiVersion:'1.15.0',entry:'plugin.js',scripts:['plugin.js'],styles:['plugin.css'],enabled:true,order:920,
    description:'Tool Workspace using the same dedicated-window contract as TOP, grouped under the Core Tools button.',pluginType:'tool',
    requiresCore:['workspace','ui.dom','ui.workspace','ui.scientific-plot','ui.activities','ui.top-workspace','ui.pages'],
    capabilities:['ui.page','ui.top-workspace','ui.plugin-workspace','ui.scientific-plot'],
    workspace:{role:'top',activity:'sdk-tool-example',icon:'⌁',title:'SDK Tool Example'},
    window:{activity:'sdk-tool-example',title:'SDK Tool Example',width:1080,height:720,minWidth:760,minHeight:520,dependencies:['d3'],prewarm:false,reuse:true,persistence:'project',artifactHydration:'live'},
    compatibility:{app:'>=3.61.18 <4.0.0',pluginApi:'^1.15.0'}
  };
  DKDSPlugins.define(manifest, async ctx => {
    let workspace=null,surface=null;
    ctx.ui.activities.add({id:'sdk-tool-example',label:'SDK Tool',icon:'⌁',order:920,primary:true,openMode:'window',artifactHydration:'live',onActivate:()=>ctx.workspace.openPage('sdkToolExamplePage')});
    const page=ctx.ui.pages.add({id:'sdk-tool-example-page',pageId:'sdkToolExamplePage',activity:'sdk-tool-example',label:'SDK Tool',title:'SDK Tool Workspace Example',toolbar:false,html:'<div class="analysis-page-header"><div><h2>SDK Tool Workspace Example</h2><div class="sdk-tool-subtitle">Tool category · TOP-equivalent lifecycle · Tools-menu entry</div></div></div><div class="analysis-page-body"><div class="sdk-tool-workbench"></div></div>'});
    const host=ctx.ui.dom.query('.sdk-tool-workbench',page);
    workspace=ctx.ui.pluginWorkspace.create(host,{header:false,activity:'sdk-tool-example',primaryScroll:'contained'});
    workspace.mountPrimary({id:'main',label:'工具',scroll:'contained',mount:({main})=>{const shell=ctx.ui.dom.create('div',{className:'sdk-tool-main'}),plot=ctx.ui.dom.create('div',{className:'sdk-tool-plot'});ctx.ui.dom.append(shell,plot);ctx.ui.dom.append(main,shell);surface=ctx.ui.scientificPlot.create(plot,{minHeight:200,xTitle:'X',yTitle:'Y',getCurves:()=>[],getMarkers:()=>[]});return()=>{surface?.dispose?.();surface=null;};}});
    ctx.ui.topWorkspace.register({id:'sdk-tool-example',activity:'sdk-tool-example',label:'SDK Tool',icon:'⌁',layout:{mode:'native',root:{selector:'#sdkToolExamplePage .dkds-plugin-workspace'},primary:{id:'main',role:'analysis-primary'},prime:[],sub:[]}});
    return{deactivate(){surface?.dispose?.();workspace?.dispose?.();}};
  });
})();
