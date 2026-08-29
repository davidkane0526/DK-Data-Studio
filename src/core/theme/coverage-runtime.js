(() => {
  'use strict';
  const VERSION='4.0.0';
  const Contract=window.DKDSThemeCoverageContract;
  const Semantic=window.DKDSSemanticUI;
  if(!Contract||!Semantic)throw new Error('Theme Coverage requires ThemeCoverageContract and DKDSSemanticUI.');
  const ROLE_AREAS=Object.freeze(Semantic.materialAreas().map(row=>Object.freeze(row)));
  const roleOf=el=>String(getComputedStyle(el).getPropertyValue('--dkds-material-role')||'').trim().replace(/["']/g,'');
  const OK_RENDER=new Set(['REAL_MATERIAL','MATERIAL_DISABLED','MATERIAL_SEMANTIC_OVERRIDE','MATERIAL_CHROME_OWNED','MATERIAL_PARENT_OWNED']);
  const BROKEN_RENDER=new Set(['BROKEN_MATERIAL_RENDERER','BROKEN_OPTICAL_RENDERER','ROLE_MISSING','RECIPE_MISSING','BACKDROP_FILTER_NONE','ENGINE_UNSUPPORTED','LOW_CONTRAST_MATERIAL']);
  function areaCoverage(){
    const Renderer=window.DKDSThemeMaterialRenderer;
    return ROLE_AREAS.map(area=>{
      const nodes=[...document.querySelectorAll(area.selector)];
      const ownershipRows=nodes.map(el=>Renderer?.ownership?.(el,area.role)||{managed:roleOf(el)===area.role,status:roleOf(el)===area.role?'MATERIAL_ROLE_OWNED':'ROLE_MISSING',role:roleOf(el),expectedRole:area.role});
      const managed=ownershipRows.filter(row=>row?.managed===true).length;
      const mismatches=ownershipRows.filter(row=>!row?.managed&&row?.role&&row.role!==area.role).length;
      const renderRows=nodes.map((el,index)=>{const owner=ownershipRows[index];if(owner?.managed&&owner.status!=='MATERIAL_ROLE_OWNED')return owner;return Renderer?.inspect?.(el,area.role)||{status:'BROKEN_MATERIAL_RENDERER',role:roleOf(el),expectedRole:area.role};});
      const broken=renderRows.filter(row=>BROKEN_RENDER.has(row.status)).length;
      const recipeMissing=renderRows.filter(row=>row.status==='RECIPE_MISSING').length;
      const occluded=renderRows.filter(row=>row.status==='OPAQUE_PARENT_OCCLUSION').length;
      const real=renderRows.filter(row=>OK_RENDER.has(row.status)).length;
      let status='NOT_PRESENT';if(nodes.length){if(mismatches)status='ROLE_MISMATCH';else if(managed===nodes.length)status=broken?'PARTIAL':'MANAGED';else if(managed)status='PARTIAL';else status='UNMANAGED';}
      const renderStatus=!nodes.length?'NOT_PRESENT':broken?'PARTIAL':occluded&&real?'PARTIAL':occluded?'OPAQUE_PARENT_OCCLUSION':'MANAGED';
      return Object.freeze({...area,count:nodes.length,managed,status,renderStatus,realMaterial:real,occludedMaterial:occluded,brokenMaterial:broken,roleMismatch:mismatches,recipeMissing,render:Object.freeze(renderRows.slice(0,24))});
    });
  }
  function pluginStyleIssues(){
    const issues=[];
    for(const style of document.querySelectorAll('style[data-plugin-id]')){const pluginId=String(style.dataset.pluginId||'');issues.push(...Contract.auditCss(style.textContent||'',{pluginId,source:`style:${style.dataset.pluginStyle||'inline'}`}));}
    for(const root of document.querySelectorAll('[data-plugin-id]')){
      const pluginId=String(root.dataset.pluginId||''),nodes=[root,...root.querySelectorAll('[style]')];
      for(const el of nodes){const text=el.getAttribute?.('style')||'';if(!text)continue;if(el.closest?.('svg,.dkds-scientific-surface-host,.dkds-scientific-auto-legend,[data-series-id],[data-trace-id],[data-legend-id]'))continue;issues.push(...Contract.auditInlineStyle(text,{pluginId,source:'inline-style',selector:el.tagName?.toLowerCase?.()||'[style]'}));}
    }
    const key=new Set();return issues.filter(row=>{const id=[row.pluginId,row.source,row.selector,row.property,row.value].join('|');if(key.has(id))return false;key.add(id);return true;});
  }
  const CONTRAST_SELECTOR='#pluginManagerPage button,#pluginManagerPage select,#pluginManagerPage input,.dkds-mode-group button,.activity-tab.active';
  const parseColor=value=>{const text=String(value||'').trim();let m=text.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)%?)?\s*\)/i);if(m){let a=m[4]==null?1:Number(m[4]);if(String(m[4]||'').includes('%'))a/=100;return {r:Number(m[1]),g:Number(m[2]),b:Number(m[3]),a:Number.isFinite(a)?a:1};}m=text.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/i);if(m)return {r:Number(m[1])*255,g:Number(m[2])*255,b:Number(m[3])*255,a:m[4]==null?1:Number(m[4])};return null;};
  const composite=(front,back)=>{const fa=Math.max(0,Math.min(1,front?.a??0)),ba=Math.max(0,Math.min(1,back?.a??1)),a=fa+ba*(1-fa);if(a<=0)return {r:0,g:0,b:0,a:0};return {r:(front.r*fa+back.r*ba*(1-fa))/a,g:(front.g*fa+back.g*ba*(1-fa))/a,b:(front.b*fa+back.b*ba*(1-fa))/a,a};};
  const luminance=c=>{const f=v=>{v=Math.max(0,Math.min(255,v))/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b);};
  const contrastRatio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  function effectiveBackground(el){let out={r:0,g:0,b:0,a:0},node=el,depth=0;while(node&&depth<12){const bg=parseColor(getComputedStyle(node).backgroundColor);if(bg&&bg.a>0)out=composite(out,bg);if(out.a>=.985)break;node=node.parentElement;depth++;}if(out.a<.985){const fallback=parseColor(getComputedStyle(document.body).backgroundColor)||((window.DKDSTheme?.current?.()||'light')==='dark'?{r:10,g:16,b:32,a:1}:{r:238,g:244,b:251,a:1});out=composite(out,fallback);}return out;}
  function controlContrast(){const rows=[],nodes=[...document.querySelectorAll(CONTRAST_SELECTOR)];let checked=0,disabledExempt=0;for(const el of nodes){const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden')continue;if(el.matches?.(':disabled,[aria-disabled="true"]')){disabledExempt++;continue;}const fg=parseColor(style.color),bg=effectiveBackground(el);if(!fg||!bg)continue;checked++;const resolvedFg=fg.a<.999?composite(fg,bg):fg,ratio=contrastRatio(resolvedFg,bg),minimum=4.5;if(ratio+1e-6<minimum)rows.push(Object.freeze({tag:String(el.tagName||'').toLowerCase(),id:String(el.id||''),className:String(el.className||''),text:String(el.textContent||el.getAttribute?.('aria-label')||'').trim().slice(0,80),foreground:String(style.color||''),background:String(style.backgroundColor||''),effectiveBackground:bg,ratio:Number(ratio.toFixed(2)),minimum,disabled:false}));}return Object.freeze({checked,disabledExempt,issues:Object.freeze(rows),ok:rows.length===0});}
  function appearanceCoverage(){
    const runtime=window.DKDSThemeComponentAppearance;
    const report=runtime?.scan?.()||{version:'0.0.0',rows:[],authored:[],summary:{components:0,present:0,managed:0,identityErrors:0,authoredUnused:0,ok:false}};
    const consumption=runtime?.consumption?.()||{components:{},semantic:{},scientific:{mode:'fallback-only',precedence:[]}};
    const semantic=Object.freeze(Object.entries(consumption.semantic||{}).map(([name,token])=>Object.freeze({name,token,status:token?'MANAGED':'UNMANAGED'})));
    const interaction=Object.freeze(['idle','hover','active','selected','disabled'].map(state=>Object.freeze({state,status:'MANAGED'})));
    return Object.freeze({...report,consumption,semantic,interaction});
  }
  function scan(){
    const core=areaCoverage(),issues=pluginStyleIssues(),contrast=controlContrast(),appearance=appearanceCoverage();
    const present=core.filter(x=>x.status!=='NOT_PRESENT'),notPresent=core.filter(x=>x.status==='NOT_PRESENT').length,managed=present.filter(x=>x.status==='MANAGED').length,partial=present.filter(x=>x.status==='PARTIAL').length,unmanaged=present.filter(x=>x.status==='UNMANAGED').length,roleMismatch=present.filter(x=>x.status==='ROLE_MISMATCH').length;
    const brokenMaterial=present.reduce((n,x)=>n+x.brokenMaterial,0),recipeMissing=present.reduce((n,x)=>n+x.recipeMissing,0),occludedMaterial=present.reduce((n,x)=>n+x.occludedMaterial,0),realMaterial=present.reduce((n,x)=>n+x.realMaterial,0);
    const rendererCapabilities=window.DKDSTheme?.rendererCapabilities?.()||null,appearanceOk=appearance.summary?.ok===true,authoredUnused=Number(appearance.summary?.authoredUnused||0),identityErrors=Number(appearance.summary?.identityErrors||0);
    const materialSummary=Object.freeze({total:core.length,present:present.length,notPresent,managed,partial,unmanaged,roleMismatch,recipeMissing,status:partial||unmanaged||roleMismatch||recipeMissing?'PARTIAL':'MANAGED'});
    const componentSummary=Object.freeze({total:Number(appearance.summary?.components||0),present:Number(appearance.summary?.present||0),managed:Number(appearance.summary?.managed||0),wrongIdentity:identityErrors,authoredUnused,status:appearanceOk?'MANAGED':'PARTIAL'});
    const stateSummary=Object.freeze({total:appearance.interaction?.length||0,managed:(appearance.interaction||[]).filter(x=>x.status==='MANAGED').length,status:'MANAGED'});
    const semanticColorSummary=Object.freeze({total:appearance.semantic?.length||0,managed:(appearance.semantic||[]).filter(x=>x.status==='MANAGED').length,status:(appearance.semantic||[]).every(x=>x.status==='MANAGED')?'MANAGED':'PARTIAL'});
    const ok=partial===0&&unmanaged===0&&roleMismatch===0&&brokenMaterial===0&&occludedMaterial===0&&appearanceOk&&authoredUnused===0&&identityErrors===0&&contrast.issues.length===0&&issues.length===0;
    return Object.freeze({version:VERSION,contractVersion:window.DKDSTheme?.contractVersion||'0.0.0',profile:window.DKDSTheme?.profile?.()||'builtin.default',mode:window.DKDSTheme?.current?.()||'light',rendererCapabilities,core:Object.freeze(core),appearance,contrast,plugins:Object.freeze({issues:Object.freeze(issues),summary:Contract.summarize(issues)}),coverage:Object.freeze({material:materialSummary,appearance:componentSummary,components:componentSummary,state:stateSummary,semanticColor:semanticColorSummary}),summary:Object.freeze({areas:present.length,totalAreas:core.length,notPresentAreas:notPresent,managed,partial,unmanaged,roleMismatch,recipeMissing,realMaterial,brokenMaterial,occludedMaterial,componentTypes:componentSummary.total,presentComponentTypes:componentSummary.present,managedComponents:componentSummary.managed,wrongComponentIdentity:identityErrors,authoredUnused,appearanceOk,lowContrastControls:contrast.issues.length,pluginIssues:issues.length,rendererOk:brokenMaterial===0&&occludedMaterial===0,ok})});
  }
  window.DKDSThemeCoverage=Object.freeze({version:VERSION,areas:()=>ROLE_AREAS.map(x=>({...x})),scan,contrast:controlContrast,appearance:appearanceCoverage,auditPluginStyles:pluginStyleIssues});
})();
