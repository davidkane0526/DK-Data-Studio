(() => {
  const manifest={
    id:'com.dkds.theme.liquid-glass',name:'Thin Glass',version:'1.10.0',apiVersion:'1.18.0',pluginType:'theme',
    requiresCore:['ui.theme'],capabilities:['ui.theme'],compatibility:{app:'>=3.64.0 <4.0.0',pluginApi:'^1.18.0',themeContract:'^3.8.0'}
  };
  DKDSPlugins.define(manifest,async ctx=>{
    const theme=ctx.ui.theme;
    const required=['contract:3.8.0','contract.appearance.roles','contract.appearance.components','contract.scientific.seriesPalette','contract.scientific.precedence','contract.material.recipes','renderer.recipes.thin-glass','renderer.thinGlass'];
    const missing=required.filter(feature=>!theme.supports(feature));
    if(missing.length)throw new Error(`Thin Glass 1.10.0 requires Theme Contract 3.8 semantic appearance/consumption and thin-glass support: ${missing.join(', ')}`);
    const renderer=theme.rendererCapabilities?.();
    if(renderer?.version!=='sdk-validator'&&(renderer?.recipes?.['thin-glass']!==true||renderer?.renderer?.thinGlass!==true||renderer?.renderer?.backdropBlur!==true))throw new Error('Thin Glass requires the Core thin-glass backdrop renderer.');
    const handle=theme.register('liquid-glass',{
      label:'Thin Glass',
      metadata:{family:'thin-glass',contract:'theme-3.8',renderer:'core-thin-glass',opticalModel:'single-layer-low-radius-backdrop'},
      recipes:{chrome:'thin-glass',sidebar:'thin-glass',surface:'clear',elevated:'thin-glass',popover:'thin-glass',control:'clear',floating:'thin-glass'},
      scientific:{mode:'fallback-only',seriesPalette:['#2563EB','#14B8A6','#8B5CF6','#E25555','#D98E22','#0E8FA5','#7C6BD6','#2B8A66']},
      settings:[
        {id:'chromeBlur',label:'顶部栏模糊',target:{scope:'material',role:'chrome',key:'materialBlur'},type:'range',min:3,max:8,step:1},
        {id:'sidebarBlur',label:'侧栏模糊',target:{scope:'material',role:'sidebar',key:'materialBlur'},type:'range',min:3,max:8,step:1},
        {id:'pageBlur',label:'独立页面模糊',target:{scope:'material',role:'elevated',key:'materialBlur'},type:'range',min:4,max:10,step:1},
        {id:'floatingBlur',label:'悬浮工具模糊',target:{scope:'material',role:'floating',key:'materialBlur'},type:'range',min:4,max:12,step:1},
        {id:'popoverBlur',label:'菜单模糊',target:{scope:'material',role:'popover',key:'materialBlur'},type:'range',min:6,max:14,step:1}
      ],
      material:{materialBlur:7,materialBlurStrong:9,materialSaturation:1.035,materialTintOpacity:.72,materialNoiseOpacity:0,specularHighlight:'rgba(255,255,255,.16)',innerHighlight:'rgba(255,255,255,.24)',glassEdge:'rgba(100,116,139,.34)',roles:{
        chrome:{materialBlur:6,materialBlurStrong:7,materialSaturation:1.02,materialTintOpacity:.68},sidebar:{materialBlur:6,materialBlurStrong:7,materialSaturation:1.02,materialTintOpacity:.66},surface:{materialBlur:0,materialBlurStrong:0,materialSaturation:1,materialTintOpacity:1},elevated:{materialBlur:10,materialBlurStrong:11,materialSaturation:1.04,materialTintOpacity:.76},popover:{materialBlur:10,materialBlurStrong:11,materialSaturation:1.04,materialTintOpacity:.78},control:{materialBlur:0,materialBlurStrong:0,materialSaturation:1,materialTintOpacity:1},floating:{materialBlur:8,materialBlurStrong:9,materialSaturation:1.035,materialTintOpacity:.68}
      }},
      motion:{motionFast:105,motionNormal:155,motionSlow:220,easeStandard:'cubic-bezier(.2,0,0,1)',easeEmphasized:'cubic-bezier(.2,.8,.2,1)',hoverLift:0,pressScale:.994},
      modes:{
        light:{tokens:{canvas:'#E8EEF5',surface:'#F7F9FC',surfaceSoft:'rgba(235,241,247,.86)',surfaceHover:'#E5EDF7',surfaceElevated:'rgba(252,253,255,.72)',surfaceSidebar:'rgba(226,235,245,.78)',controlBg:'#F7FAFD',controlHover:'#EBF2F9',divider:'rgba(104,121,144,.14)',dividerHover:'rgba(73,94,122,.28)',controlBorder:'rgba(104,121,144,.22)',controlBorderHover:'rgba(73,94,122,.36)',scrollbar:'rgba(113,128,150,.30)',scrollbarHover:'rgba(82,101,128,.46)',text:'#172033',textSoft:'#33445B',muted:'#586A82',accent:'#2563EB',accentHover:'#1D4ED8',accentSoft:'rgba(37,99,235,.10)',focus:'rgba(37,99,235,.15)',shadow1:'0 2px 6px rgba(69,84,110,.07)',shadow2:'0 5px 14px rgba(69,84,110,.09)',shadowFloat:'0 8px 20px rgba(69,84,110,.12)',radius:10,radiusLg:13},appearance:{roles:{chrome:{surface:'rgba(252,253,255,.70)',border:'rgba(183,196,214,.48)',text:'#172033'},sidebar:{surface:'rgba(226,235,245,.78)',border:'rgba(183,196,214,.42)',text:'#172033'},elevated:{surface:'rgba(252,253,255,.72)',border:'rgba(183,196,214,.50)',text:'#172033'},popover:{surface:'rgba(252,253,255,.86)',border:'rgba(171,187,209,.62)',text:'#172033'},floating:{surface:'rgba(248,251,255,.76)',border:'rgba(183,196,214,.54)',text:'#172033'}},components:{toolbarGroup:{surface:'rgba(235,241,247,.72)',border:'rgba(183,196,214,.48)',text:'#172033'},toolbarAction:{surface:'transparent',surfaceHover:'rgba(229,237,247,.82)',surfaceActive:'rgba(37,99,235,.10)',text:'#172033',textActive:'#1D4ED8',border:'transparent',borderHover:'rgba(104,121,144,.22)',borderActive:'rgba(37,99,235,.24)'}}},material:{specularHighlight:'rgba(255,255,255,.20)',innerHighlight:'rgba(255,255,255,.34)',glassEdge:'rgba(183,196,214,.50)',roles:{popover:{glassEdge:'rgba(171,187,209,.62)'},floating:{glassEdge:'rgba(183,196,214,.54)'}}}},
        dark:{tokens:{canvas:'#0A1020',surface:'#111827',surfaceSoft:'rgba(20,29,45,.78)',surfaceHover:'#1C293B',surfaceElevated:'rgba(27,38,58,.56)',surfaceSidebar:'rgba(13,22,39,.62)',controlBg:'#10192B',controlHover:'#1D2A3D',divider:'rgba(100,116,139,.15)',dividerHover:'rgba(125,142,166,.30)',controlBorder:'rgba(100,116,139,.24)',controlBorderHover:'rgba(125,142,166,.40)',scrollbar:'rgba(71,85,105,.38)',scrollbarHover:'rgba(100,116,139,.56)',text:'#E6ECF4',textSoft:'#CBD5E1',muted:'#96A5B9',accent:'#2F63DB',accentHover:'#4D7DE8',accentSoft:'rgba(47,99,219,.15)',focus:'rgba(77,125,232,.18)',shadow1:'0 2px 7px rgba(0,0,0,.18)',shadow2:'0 5px 15px rgba(0,0,0,.22)',shadowFloat:'0 8px 22px rgba(0,0,0,.27)',radius:10,radiusLg:13},appearance:{roles:{chrome:{surface:'rgba(27,38,58,.54)',border:'rgba(100,116,139,.38)',text:'#E6ECF4'},sidebar:{surface:'rgba(13,22,39,.62)',border:'rgba(100,116,139,.34)',text:'#E6ECF4'},elevated:{surface:'rgba(27,38,58,.56)',border:'rgba(100,116,139,.42)',text:'#E6ECF4'},popover:{surface:'rgba(27,38,58,.82)',border:'rgba(116,132,157,.52)',text:'#E6ECF4'},floating:{surface:'rgba(20,30,48,.70)',border:'rgba(100,116,139,.46)',text:'#E6ECF4'}},components:{toolbarGroup:{surface:'rgba(20,29,45,.66)',border:'rgba(100,116,139,.34)',text:'#E6ECF4'},toolbarAction:{surface:'transparent',surfaceHover:'rgba(28,41,59,.82)',surfaceActive:'rgba(47,99,219,.15)',text:'#E6ECF4',textActive:'#EAF1FF',border:'transparent',borderHover:'rgba(125,142,166,.30)',borderActive:'rgba(125,142,166,.34)'}}},material:{specularHighlight:'rgba(255,255,255,.10)',innerHighlight:'rgba(255,255,255,.14)',glassEdge:'rgba(100,116,139,.42)',roles:{popover:{glassEdge:'rgba(116,132,157,.52)'},floating:{glassEdge:'rgba(100,116,139,.46)'}}}}
      }
    });
    return{deactivate(){handle?.dispose?.();}};
  });
})();
