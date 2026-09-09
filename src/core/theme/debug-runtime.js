(() => {
  'use strict';
  const StyleGate=globalThis.DKDSStyleGate;
  const StyleSemantics=globalThis.DKDSStyleOwnershipSemantics;
  if(!StyleGate||!StyleSemantics)throw new Error('DKDSStyleGate and DKDSStyleOwnershipSemantics are required before Theme Debug runtime.');
  const STYLE_SOURCE='src/core/theme/debug-runtime.js';
  const debugSet=(el,property,value)=>StyleGate.set(el,property,value,{owner:'core.theme-debug-overlay',scope:'runtime-debug-overlay',source:STYLE_SOURCE});
  const VERSION='2.10.0';
  let enabled=false,overlay=null,last=null,lastTrace=null,moveHandler=null,clickHandler=null,keyHandler=null,pinned=false,traceFilter='all',gateAuditRelease=null;
  let dragState=null,dragMoveHandler=null,dragEndHandler=null;
  const POSITION_KEY='dkds.themeInspector.position';
  function readPosition(){try{const row=JSON.parse(sessionStorage.getItem(POSITION_KEY)||'null');return Number.isFinite(row?.x)&&Number.isFinite(row?.y)?row:null;}catch{return null;}}
  function writePosition(x,y){try{sessionStorage.setItem(POSITION_KEY,JSON.stringify({x,y}));}catch{}}
  function placeOverlay(host=overlay,pos=readPosition()){if(!host||!pos)return;const maxX=Math.max(8,innerWidth-host.offsetWidth-8),maxY=Math.max(8,innerHeight-host.offsetHeight-8);const x=Math.min(maxX,Math.max(8,pos.x)),y=Math.min(maxY,Math.max(8,pos.y));debugSet(host,'left',`${x}px`);debugSet(host,'top',`${y}px`);debugSet(host,'right','auto');}
  const pauseOwners=new Set();
  const isPaused=()=>pauseOwners.size>0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const componentName=el=>{if(!el)return '(none)';const label=el.getAttribute?.('aria-label')||el.getAttribute?.('title')||'';if(label)return label;if(el.id)return `#${el.id}`;const cls=String(el.className||'').trim().split(/\s+/).filter(Boolean).slice(0,3).join('.');return `${String(el.tagName||'element').toLowerCase()}${cls?'.'+cls:''}`;};
  const materialTarget=el=>el?.closest?.('[data-dkds-material-role],[class*="dkds-material-role-"]')||el||null;
  const inlineAppearance=el=>{const style=String(el?.getAttribute?.('style')||'');return /(?:^|;)\s*(?:background(?:-color|-image)?|color|border(?:-color)?|box-shadow)\s*:/i.test(style);};

  const TRACE_GROUPS=Object.freeze({
    Geometry:Object.freeze(['width','height','min-width','min-height','max-width','max-height','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','gap','row-gap','column-gap','border-radius']),
    Paint:Object.freeze(['background-color','background-image','color','border-color','box-shadow','backdrop-filter','opacity']),
    Motion:Object.freeze(['transition-property','transition-duration','transition-timing-function','transition-delay','animation-name','animation-duration','animation-timing-function','transform'])
  });
  const TRACE_DEFAULT_PROPERTIES=Object.freeze([...new Set(Object.values(TRACE_GROUPS).flat())]);
  const RUNTIME_GATE_GROUPS=Object.freeze({
    RuntimeInline:Object.freeze({label:'Runtime inline',kind:StyleGate.KINDS.RUNTIME_INLINE}),
    RuntimePaint:Object.freeze({label:'Runtime paint',kind:StyleGate.KINDS.RUNTIME_PAINT}),
    RuntimePresentation:Object.freeze({label:'Runtime presentation',kind:StyleGate.KINDS.RUNTIME_PRESENTATION})
  });
  const TRACE_SHORTHANDS=Object.freeze({
    'padding-top':['padding','padding-block','padding-top'],'padding-right':['padding','padding-inline','padding-right'],
    'padding-bottom':['padding','padding-block','padding-bottom'],'padding-left':['padding','padding-inline','padding-left'],
    'margin-top':['margin','margin-block','margin-top'],'margin-right':['margin','margin-inline','margin-right'],
    'margin-bottom':['margin','margin-block','margin-bottom'],'margin-left':['margin','margin-inline','margin-left'],
    'gap':['gap'],'row-gap':['gap','row-gap'],'column-gap':['gap','column-gap'],
    'background-color':['background','background-color'],'background-image':['background','background-image'],'color':['color'],
    'border-color':['border','border-color','border-top','border-right','border-bottom','border-left'],'border-top':['border','border-top'],'border-right':['border','border-right'],'border-bottom':['border','border-bottom'],'border-left':['border','border-left'],
    'border-top-color':['border','border-color','border-top','border-top-color'],'border-right-color':['border','border-color','border-right','border-right-color'],'border-bottom-color':['border','border-color','border-bottom','border-bottom-color'],'border-left-color':['border','border-color','border-left','border-left-color'],
    'border-radius':['border-radius'],'border-top-left-radius':['border-radius','border-top-left-radius'],'border-top-right-radius':['border-radius','border-top-right-radius'],'border-bottom-right-radius':['border-radius','border-bottom-right-radius'],'border-bottom-left-radius':['border-radius','border-bottom-left-radius'],
    'box-shadow':['box-shadow'],'backdrop-filter':['backdrop-filter','-webkit-backdrop-filter'],'opacity':['opacity'],
    'transform':['transform'],'width':['width'],'height':['height'],'min-width':['min-width'],'min-height':['min-height'],'max-width':['max-width'],'max-height':['max-height'],
    'transition-property':['transition','transition-property'],'transition-duration':['transition','transition-duration'],'transition-timing-function':['transition','transition-timing-function'],'transition-delay':['transition','transition-delay'],
    'animation-name':['animation','animation-name'],'animation-duration':['animation','animation-duration'],'animation-timing-function':['animation','animation-timing-function']
  });
  const sheetLabel=sheet=>{
    const href=String(sheet?.href||'');if(!href)return 'inline-style';
    try{
      const pathname=decodeURIComponent(new URL(href,location.href).pathname).replace(/\\/g,'/');
      for(const marker of ['/src/','/mobile/','/sdk/','/examples/']){const index=pathname.lastIndexOf(marker);if(index>=0)return pathname.slice(index+1);}
      return pathname.split('/').filter(Boolean).slice(-3).join('/')||href;
    }catch{return href;}
  };
  function ruleContextActive(rule){
    try{if(rule?.media?.mediaText&&typeof globalThis.matchMedia==='function'&&!globalThis.matchMedia(rule.media.mediaText).matches)return false;}catch{}
    try{if(rule?.constructor?.name==='CSSSupportsRule'&&rule.conditionText&&globalThis.CSS?.supports&&!globalThis.CSS.supports(rule.conditionText))return false;}catch{}
    return true;
  }
  function traceRuleList(rules,target,properties,source,out,order){
    for(const rule of Array.from(rules||[])){
      if(!ruleContextActive(rule))continue;
      if(rule?.cssRules){try{traceRuleList(rule.cssRules,target,properties,source,out,order);}catch{}continue;}
      const selector=String(rule?.selectorText||'');if(!selector||!rule?.style)continue;
      let matched=false;try{matched=target.matches(selector);}catch{}if(!matched)continue;
      for(const property of properties){
        const aliases=TRACE_SHORTHANDS[property]||[property];
        const declarations=[];
        for(const alias of aliases){const value=rule.style.getPropertyValue(alias);if(value)declarations.push(Object.freeze({property:alias,value:value.trim(),important:rule.style.getPropertyPriority(alias)==='important'}));}
        if(declarations.length)out.push(Object.freeze({property,selector,source,order:order.value++,declarations:Object.freeze(declarations)}));
      }
    }
  }
  const sourceOwner=source=>{const raw=String(source||'');if(raw==='inline-style')return'Runtime Inline';const value=`/${raw.replace(/\\/g,'/').replace(/^\/+/, '')}`;if(value.includes('/styles/structure/'))return'Core Structure';if(value.includes('/styles/presentation/'))return'Core Presentation';if(value.includes('/styles/theme/'))return'Core Theme';if(value.includes('/styles/motion/'))return'Core Motion';if(value.includes('/styles/platform/')||value.endsWith('/mobile.css'))return'Platform Configuration';if(value.includes('/plugins/'))return'Plugin';if(value.includes('plugin-window/style.css'))return'Window Context';return'Authored CSS';};
  const customTokens=value=>[...new Set([...String(value||'').matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map(row=>row[1]))];
  function traceTokenProvenance(target,token){
    const candidates=[],order={value:0};let node=target;
    while(node?.nodeType===1){for(const sheet of Array.from(document.styleSheets||[])){try{traceRuleList(sheet.cssRules,node,[token],sheetLabel(sheet),candidates,order);}catch{}}if(node===document.documentElement)break;node=node.parentElement;}
    const inline=[];node=target;while(node?.nodeType===1){const value=node.style?.getPropertyValue?.(token);if(value)inline.push(Object.freeze({element:componentName(node),value:value.trim()}));if(node===document.documentElement)break;node=node.parentElement;}
    return Object.freeze({token,value:String(getComputedStyle(target).getPropertyValue(token)||'').trim(),candidates:Object.freeze(candidates),inline:Object.freeze(inline)});
  }
  function ownerStatus(row){
    const authored=[...new Set((row.candidates||[]).map(candidate=>candidate.source))];
    if(row.inline?.length&&authored.length)return'INLINE_OVERRIDES_AUTHORED';
    if(row.inline?.length)return'INLINE_RUNTIME_OWNER';
    if(authored.length===1)return'SINGLE_AUTHORED_OWNER';
    if(authored.length>1)return'MULTIPLE_AUTHORED_OWNERS';
    return'UNOWNED_OR_INHERITED';
  }
  function traceOwnership(el,properties=TRACE_DEFAULT_PROPERTIES,{configuration=true}={}){
    const target=el?.nodeType===1?el:null;if(!target)return Object.freeze({element:null,properties:Object.freeze([])});
    const props=[...new Set((Array.isArray(properties)?properties:TRACE_DEFAULT_PROPERTIES).map(x=>String(x||'').trim()).filter(Boolean))],component=globalThis.DKDSThemeComponentAppearance?.inspect?.(target)||{},identity=component.componentIdentity||component.component||target.dataset?.dkdsComponentIdentity||componentName(target),gateStates=StyleSemantics.statesForElement(target),gateContext=StyleSemantics.contextForElement(target);
    const candidates=[],order={value:0};
    for(const sheet of Array.from(document.styleSheets||[])){try{traceRuleList(sheet.cssRules,target,props,sheetLabel(sheet),candidates,order);}catch{}}
    const inline=target.style||null,computed=getComputedStyle(target);
    const rows=props.map(property=>{
      const aliases=TRACE_SHORTHANDS[property]||[property],inlineDecl=[];
      for(const alias of aliases){const value=inline?.getPropertyValue?.(alias);if(value)inlineDecl.push({property:alias,value:value.trim(),important:inline.getPropertyPriority(alias)==='important'});}
      const matches=candidates.filter(row=>row.property===property),tokens=[...new Set(matches.flatMap(row=>row.declarations.flatMap(declaration=>customTokens(declaration.value))))],ownerFiles=[...new Set(matches.map(row=>row.source))],ownerModules=[...new Set(matches.map(row=>sourceOwner(row.source)))];
      const base={property,computed:String(computed.getPropertyValue(property)||'').trim(),inline:Object.freeze(inlineDecl),candidates:Object.freeze(matches)},authoredGate=StyleGate.evaluate({component:identity,slot:property,kind:StyleGate.KINDS.FINAL_PROPERTY,state:gateStates.join('+'),context:gateContext,scope:'authored-cascade'},ownerFiles,ownerFiles);
      return Object.freeze({...base,status:ownerStatus(base),ownerFiles:Object.freeze(ownerFiles),ownerModules:Object.freeze(ownerModules),authoredGate,configuration:Object.freeze(configuration?tokens.map(token=>traceTokenProvenance(target,token)):[])});
    });
    return Object.freeze({componentName:componentName(target),componentIdentity:identity,gateStates,gateContext,properties:Object.freeze(rows)});
  }
  function traceStyleOwner(el,property){return traceOwnership(el,[property]).properties[0]||Object.freeze({property:String(property||''),status:'UNOWNED_OR_INHERITED'});}
  function auditStyleOwnership(root=document,{properties=TRACE_DEFAULT_PROPERTIES,maxElements=300}={}){
    const base=root?.nodeType===1||root===document?root:document,selector='[data-dkds-component-identity],button,input,select,textarea,.dkds-surface-header,.dkds-scientific-nav-tools',nodes=[];
    if(base?.matches?.(selector))nodes.push(base);for(const node of base?.querySelectorAll?.(selector)||[]){nodes.push(node);if(nodes.length>=Math.max(1,Number(maxElements)||300))break;}
    const conflicts=[],inlineOwners=[],unowned=[];let tracedProperties=0;
    for(const node of nodes){
      const trace=traceOwnership(node,properties,{configuration:false});
      for(const row of trace.properties){tracedProperties++;if(row.status==='MULTIPLE_AUTHORED_OWNERS'||row.status==='INLINE_OVERRIDES_AUTHORED')conflicts.push(Object.freeze({element:componentName(node),...row}));else if(row.status==='INLINE_RUNTIME_OWNER')inlineOwners.push(Object.freeze({element:componentName(node),...row}));else if(row.status==='UNOWNED_OR_INHERITED')unowned.push(Object.freeze({element:componentName(node),...row}));}
    }
    return Object.freeze({status:conflicts.length?'CONFLICT':'PASS',scannedElements:nodes.length,tracedProperties,conflicts:Object.freeze(conflicts),inlineOwners:Object.freeze(inlineOwners),unowned:Object.freeze(unowned)});
  }
  function summarizeTraceGroup(name,properties,trace){
    const wanted=new Set(properties),rows=trace.properties.filter(row=>wanted.has(row.property));
    const active=rows.filter(row=>row.ownerFiles.length||row.inline.length),conflicts=active.filter(row=>row.status==='MULTIPLE_AUTHORED_OWNERS'||row.status==='INLINE_OVERRIDES_AUTHORED'||Number(row.authoredGate?.ownerCount)>1);
    const ownerFiles=[...new Set(active.flatMap(row=>row.ownerFiles))],ownerModules=[...new Set(active.flatMap(row=>row.ownerModules))];
    return Object.freeze({name,status:conflicts.length?'CONFLICT':active.length?'OWNED':'UNOWNED',ownerFiles:Object.freeze(ownerFiles),ownerModules:Object.freeze(ownerModules),properties:Object.freeze(active)});
  }
  function groupRuntimeGateRows(rows){
    const out={};
    for(const [name,spec] of Object.entries(RUNTIME_GATE_GROUPS)){const groupRows=rows.filter(row=>row.kind===spec.kind),conflict=groupRows.some(row=>Number(row.ownerCount)>1||row.status==='OWNER_CONFLICT');out[name]=Object.freeze({name,label:spec.label,kind:spec.kind,status:conflict?'CONFLICT':groupRows.length?'OWNED':'UNOWNED',rows:Object.freeze(groupRows)});}
    return Object.freeze(out);
  }
  const sourceMatchesExpected=(source,expected)=>{const a=String(source||'').replace(/\\/g,'/').replace(/^\/+/,''),b=String(expected||'').replace(/\\/g,'/').replace(/^src\//,'').replace(/^\/+/, '');return !!a&&!!b&&(a===b||a.endsWith('/'+b)||b.endsWith('/'+a));};
  function traceElementOwnership(el){
    const target=el?.nodeType===1?el:null;if(!target)return null;
    const appearance=globalThis.DKDSThemeComponentAppearance?.inspect?.(target)||{},componentIdentity=appearance.componentIdentity||appearance.component||target.dataset?.dkdsComponentIdentity||componentName(target),gateStates=StyleSemantics.statesForElement(target),gateContext=StyleSemantics.contextForElement(target),expectedSpecs=StyleSemantics.expectedFor(componentIdentity,gateStates,gateContext),expectedProperties=[...new Set(expectedSpecs.map(row=>row.slot))];
    const trace=traceOwnership(target,[...TRACE_DEFAULT_PROPERTIES,...expectedProperties],{configuration:true});
    const groups=Object.freeze(Object.fromEntries(Object.entries(TRACE_GROUPS).map(([name,props])=>[name,summarizeTraceGroup(name,props,trace)])));
    const lifecycle=Object.freeze([...(globalThis.DKDSComponents?.lifecycleOf?.(target,{ancestors:true})||[])]);
    const lifecycleOwners=Object.freeze([...new Set(lifecycle.map(row=>row.owner))]);
    const identityOwner=String(target.dataset?.dkdsComponentIdentityOwner||'');
    const motionRole=String(target.dataset?.dkdsMotionRole||target.dataset?.dkdsMotion||'');
    const motionRoleOwner=String(target.dataset?.dkdsMotionRoleOwner||'');
    const styleGateRows=Object.freeze([...(globalThis.DKDSStyleGate?.rowsForElement?.(target)||[])]);
    const runtimeGateGroups=groupRuntimeGateRows(styleGateRows);
    const styleGateConflict=styleGateRows.some(row=>Number(row.ownerCount)>1);
    const elementKey=StyleGate.elementKeyFor?.(target)||'';
    const gateSnapshot=globalThis.DKDSStyleGate?.snapshot?.()||{},unauthorizedEvents=Object.freeze([...(gateSnapshot.unauthorizedEvents||[])].filter(row=>row.elementKey===elementKey));
    const expectedRows=Object.freeze(expectedSpecs.map(spec=>{const traced=trace.properties.find(row=>row.property===spec.slot),owners=Object.freeze([...(traced?.ownerFiles||[])]),sources=owners,ownerSources=Object.freeze([...(traced?.authoredGate?.ownerSources||owners.map(owner=>Object.freeze({owner,sources:Object.freeze([owner])})))]),ownerCount=owners.length,expectedOwned=owners.some(source=>sourceMatchesExpected(source,spec.owner));let status=ownerCount===0?'UNOWNED':ownerCount>1?'OWNER_CONFLICT':expectedOwned?'SINGLE_OWNER':'UNEXPECTED_OWNER';return Object.freeze({type:'authored',component:componentIdentity,slot:spec.slot,state:spec.state,context:spec.context,actualContext:gateContext,expectedOwner:spec.owner,owners,sources,ownerSources,ownerCount,status});}));
    const diagnosticRows=[];
    for(const row of expectedRows)diagnosticRows.push(row);
    for(const row of styleGateRows)diagnosticRows.push(Object.freeze({type:'runtime',component:row.component||componentIdentity,slot:row.slot,state:row.state,context:row.context||gateContext,expectedOwner:'',owners:row.owners||[],sources:row.sources||[],ownerSources:row.ownerSources||[],ownerCount:Number(row.ownerCount)||0,status:row.status||'SINGLE_OWNER'}));
    for(const row of unauthorizedEvents)diagnosticRows.push(Object.freeze({type:'unauthorized',component:row.component||componentIdentity,slot:row.slot,state:row.state||'runtime',context:row.context||gateContext,expectedOwner:'',owners:row.declaredOwners||[],sources:row.declaredSources||[],ownerSources:row.declaredOwnerSources||[],ownerCount:(row.declaredOwners||[]).length,status:'UNAUTHORIZED',actual:row.actual||'',at:row.at||0}));
    const diagnostics=Object.freeze({elementKey,states:gateStates,context:gateContext,rows:Object.freeze(diagnosticRows),conflicts:diagnosticRows.filter(row=>row.status==='OWNER_CONFLICT'||row.status==='UNEXPECTED_OWNER').length,unowned:diagnosticRows.filter(row=>row.status==='UNOWNED').length,unauthorized:diagnosticRows.filter(row=>row.status==='UNAUTHORIZED').length});
    const status=diagnostics.conflicts||Object.values(groups).some(group=>group.status==='CONFLICT')||styleGateConflict?'CONFLICT':diagnostics.unauthorized?'UNAUTHORIZED':diagnostics.unowned?'UNOWNED':'PASS';
    return Object.freeze({status,element:target,componentName:trace.componentName,componentIdentity:trace.componentIdentity,identityOwner,motionRole,motionRoleOwner,gateStates,gateContext,groups,runtimeGateGroups,lifecycle,lifecycleOwners,styleGateRows,styleGateBypasses:Number(gateSnapshot.unauthorizedObserved)||0,unauthorizedEvents,expectedRows,diagnostics,trace});
  }

  function inspect(el){
    const Renderer=globalThis.DKDSThemeMaterialRenderer,Semantic=globalThis.DKDSSemanticUI,Appearance=globalThis.DKDSThemeComponentAppearance,target=materialTarget(el),component=Appearance?.inspect?.(el)||{},semanticMatch=Semantic?.resolveComponent?.(el)||null;
    const row=target&&Renderer?.inspect?Renderer.inspect(target):{status:'ROLE_MISSING',role:'',recipe:''},style=getComputedStyle(semanticMatch?.target||el||target),profile=globalThis.DKDSTheme?.preview?.()||{},expectedRole=component.expectedRole||Semantic?.expectedRole?.(semanticMatch?.target||el)||'',actualRole=row.role||'',expectedRecipe=actualRole?String(globalThis.DKDSTheme?.recipePolicy?.()?.[actualRole]||''):'';
    const surface=component.resolved?.surface||null,text=component.resolved?.text||null,border=component.resolved?.border||null,statuses=[];
    if(!component.managed&&component.status==='UNMANAGED_COMPONENT_APPEARANCE')statuses.push('UNMANAGED_COMPONENT_APPEARANCE');
    if(component.status==='WRONG_COMPONENT_IDENTITY')statuses.push('WRONG_COMPONENT_IDENTITY');
    if(expectedRole&&actualRole&&expectedRole!==actualRole&&!['MATERIAL_PARENT_OWNED','MATERIAL_CHROME_OWNED','MATERIAL_SEMANTIC_OVERRIDE'].includes(row.status))statuses.push('ROLE_MISMATCH');
    if(actualRole&&expectedRecipe&&row.recipe&&expectedRecipe!==row.recipe)statuses.push('RECIPE_MISMATCH');
    if(component.managed&&surface&&!surface.value&&!surface.fallback)statuses.push('TOKEN_NOT_CONSUMED');
    const unused=Appearance?.authoredUsage?.()?.some?.(x=>x.status==='AUTHORED_BUT_UNUSED'&&x.component===component.component);if(unused)statuses.push('AUTHORED_BUT_UNUSED');
    if(row.status==='OPAQUE_MATERIAL_OCCLUSION')statuses.push('OPAQUE_MATERIAL_OCCLUSION');
    if(row.status==='ENGINE_UNSUPPORTED')statuses.push('ENGINE_UNSUPPORTED');
    if(inlineAppearance(semanticMatch?.target||el)&&!(semanticMatch?.target||el)?.closest?.('svg,.dkds-scientific-surface-host,[data-series-id],[data-trace-id]'))statuses.push('HARDCODED_APPEARANCE');
    if(!statuses.length)statuses.push('MANAGED');
    return Object.freeze({componentName:componentName(semanticMatch?.target||el),element:semanticMatch?.target||el,componentIdentity:component.componentIdentity||component.component||'',componentVariant:component.variant||'',componentState:component.state||'',materialRole:actualRole,expectedMaterialRole:expectedRole,materialRecipe:row.recipe||'',expectedMaterialRecipe:expectedRecipe,materialBaseToken:row.baseToken||'',occludingChild:row.occludingChild||'',occlusionSource:row.occlusionSource||'',opaqueAncestor:row.opaqueParent||null,appearanceSlot:surface?.path||'',resolvedTokenName:surface?.cssVar||'',resolvedTokenValue:surface?.value||surface?.fallback||'',resolvedTokenSource:surface?.source||'',sourceTheme:profile.id||globalThis.DKDSTheme?.profile?.()||'',computedBackground:style?.backgroundColor||'',computedTextColor:style?.color||'',computedBorder:style?.borderColor||'',computedBackdropFilter:style?.backdropFilter||style?.webkitBackdropFilter||'',rendererStatus:row.status||'',statuses:Object.freeze([...new Set(statuses)]),appearance:component,material:row});
  }
  const shortSource=value=>String(value||'').split('/').slice(-3).join('/');
  function ownerSourcePairs(row={}){
    const explicit=Array.isArray(row.ownerSources)?row.ownerSources:[];if(explicit.length)return explicit.map(pair=>Object.freeze({owner:String(pair?.owner||'unclaimed'),sources:Object.freeze([...(pair?.sources||[])])}));
    const owners=[...(row.owners||[])],sources=[...(row.sources||[])];if(!owners.length)return Object.freeze([]);
    if(owners.length===sources.length&&owners.every(owner=>sources.includes(owner)))return Object.freeze(owners.map(owner=>Object.freeze({owner,sources:Object.freeze([owner])})));
    return Object.freeze(owners.map(owner=>Object.freeze({owner,sources:Object.freeze(sources)})));
  }
  function ownerSourceChain(row={}){
    const pairs=ownerSourcePairs(row);if(!pairs.length)return'unclaimed → source unavailable';
    return pairs.map(pair=>`${pair.owner||'unclaimed'} → ${pair.sources?.length?pair.sources.map(shortSource).join(', '):'source unavailable'}`).join(' | ');
  }
  function diagnosticChain(row={}){const expected=String(row.context||'*'),actual=String(row.actualContext||'');const context=actual&&actual!==expected?`${expected} (actual ${actual})`:expected;return `${ownerSourceChain(row)} → context ${context} → state ${row.state||'runtime'}`;}
  function diagnosticSources(row={}){return Object.freeze([...new Set(ownerSourcePairs(row).flatMap(pair=>pair.sources||[]).map(value=>String(value||'').trim()).filter(Boolean))]);}
  function diagnosticSourceText(row={}){return diagnosticSources(row).join('\n');}
  async function copyDiagnosticSource(row={}){const text=diagnosticSourceText(row);if(!text)return false;try{if(globalThis.DKDSIO?.clipboard?.writeText){await globalThis.DKDSIO.clipboard.writeText(text);return true;}}catch{}try{if(globalThis.navigator?.clipboard?.writeText){await globalThis.navigator.clipboard.writeText(text);return true;}}catch{}return false;}
  const diagnosticCopyButton=row=>{const source=diagnosticSourceText(row);return source?` <button type=\"button\" data-theme-debug-copy-source=\"${esc(source)}\" data-dkds-native-copy=\"clipboard\" title=\"${esc(source)}\">复制来源</button>`:'';};
  function traceGroupHtml(group){
    if(!group)return'';const owners=group.ownerModules.length?group.ownerModules.join(' + '):'none',files=group.ownerFiles.length?group.ownerFiles.map(shortSource).join(', '):'none';
    const props=group.properties.slice(0,8).map(row=>esc(`${row.property}=${row.computed||'(empty)'} ← ${row.status==='INLINE_RUNTIME_OWNER'?'inline':row.ownerFiles.map(shortSource).join('|')||'inherited'} · ownerCount ${row.authoredGate?.ownerCount??0}`)).join('<br>');
    return `<div class="dkds-theme-trace-group" data-status="${esc(group.status)}"><b>${esc(group.name)} owner</b>: ${esc(owners)}<br><small>${esc(files)}</small>${props?`<div class="dkds-theme-trace-props">${props}</div>`:''}</div>`;
  }
  function runtimeGateGroupHtml(group){
    if(!group)return'';
    const rows=group.rows?.length?group.rows.map(row=>esc(`${row.slot}: ${row.status||'SINGLE_OWNER'} · ownerCount ${row.ownerCount??1} · ${diagnosticChain(row)}`)).join('<br>'):'none';
    return `<div class="dkds-theme-trace-group" data-status="${esc(group.status)}"><b>${esc(group.label)}</b>:<br>${rows}</div>`;
  }
  const diagnosticStatusFilter=(row,filter)=>filter==='all'||(filter==='conflict'&&(row.status==='OWNER_CONFLICT'||row.status==='UNEXPECTED_OWNER'))||(filter==='unowned'&&row.status==='UNOWNED')||(filter==='unauthorized'&&row.status==='UNAUTHORIZED');
  function styleTraceDiagnosticsHtml(trace){
    const diagnostics=trace?.diagnostics;if(!diagnostics)return'';const rows=(diagnostics.rows||[]).filter(row=>diagnosticStatusFilter(row,traceFilter)).slice(0,36),filters=[['all','All'],['conflict',`Conflict ${diagnostics.conflicts}`],['unowned',`Unowned ${diagnostics.unowned}`],['unauthorized',`Unauthorized ${diagnostics.unauthorized}`]];
    const controls=`<div class="dkds-theme-trace-filters" role="group" aria-label="Style Trace diagnostics filter">${filters.map(([id,label])=>`<button type="button" data-theme-debug-filter="${id}" aria-pressed="${traceFilter===id?'true':'false'}">${esc(label)}</button>`).join('')}</div>`;
    const body=rows.length?rows.map(row=>`<div class="dkds-theme-trace-diagnostic" data-status="${esc(row.status)}"><b>${esc(row.status)}</b> · ${esc(row.type)} · ${esc(row.slot)}${diagnosticCopyButton(row)}<br><small>${esc(diagnosticChain(row))}</small></div>`).join(''):'<div class="dkds-theme-trace-empty">No diagnostics in this filter for the pinned element.</div>';
    return `<div class="dkds-theme-trace-group"><b>Selected element diagnostics</b> · context ${esc(diagnostics.context||'*')} · states ${esc((diagnostics.states||[]).join('+'))}${controls}${body}</div>`;
  }
  function styleTraceHtml(trace){
    if(!trace)return '<div class="dkds-theme-trace-empty">Click an element to pin and resolve Style Trace ownership.</div>';
    const lifecycle=trace.lifecycle.length?trace.lifecycle.map(row=>esc(`${row.owner} · ${row.kind}${row.detail?` · ${row.detail}`:''}${row.depth?` (ancestor +${row.depth})`:''}`)).join('<br>'):esc(`${trace.identityOwner||'none'} · component identity`);
    const tokenRows=[];for(const group of Object.values(trace.groups))for(const row of group.properties)for(const config of row.configuration||[])tokenRows.push(`${row.property}: ${config.token}=${config.value||'(empty)'}`);
    const runtimeGroups=trace.runtimeGateGroups||{};
    return `<section class="dkds-theme-style-trace"><div><b>Style Trace</b> · <b>${esc(trace.status)}</b></div>${styleTraceDiagnosticsHtml(trace)}${traceGroupHtml(trace.groups.Geometry)}${traceGroupHtml(trace.groups.Paint)}${traceGroupHtml(trace.groups.Motion)}${runtimeGateGroupHtml(runtimeGroups.RuntimeInline)}${runtimeGateGroupHtml(runtimeGroups.RuntimePaint)}${runtimeGateGroupHtml(runtimeGroups.RuntimePresentation)}<div class="dkds-theme-trace-group"><small>Runtime Gate observed bypasses: ${esc(trace.styleGateBypasses||0)}</small></div><div class="dkds-theme-trace-group"><b>Interaction / lifecycle owner</b>:<br>${lifecycle}</div><div class="dkds-theme-trace-group"><b>Motion role</b>: ${esc(trace.motionRole||'none')} ${trace.motionRoleOwner?`← ${esc(trace.motionRoleOwner)}`:''}</div>${tokenRows.length?`<div class="dkds-theme-trace-group"><b>Configuration tokens</b><br>${tokenRows.slice(0,12).map(esc).join('<br>')}</div>`:''}</section>`;
  }
  function ensureOverlay(){
    if(overlay?.isConnected)return overlay;
    overlay=document.createElement('div');
    overlay.id='dkdsThemeDebugOverlay';
    overlay.className='dkds-theme-debug-overlay';
    overlay.setAttribute('role','status');
    overlay.hidden=isPaused();
    overlay.addEventListener('click',event=>{
      const act=event.target?.closest?.('[data-theme-debug-act]')?.dataset.themeDebugAct;
      if(act==='exit'){event.preventDefault();event.stopPropagation();disable();return;}
      const copySource=event.target?.closest?.('[data-theme-debug-copy-source]')?.dataset.themeDebugCopySource;if(copySource){event.preventDefault();event.stopPropagation();void copyDiagnosticSource({ownerSources:[{owner:'selected-trace',sources:String(copySource).split('\n')} ]});return;}
      const filter=event.target?.closest?.('[data-theme-debug-filter]')?.dataset.themeDebugFilter;if(filter&&['all','conflict','unowned','unauthorized'].includes(filter)){traceFilter=filter;event.preventDefault();event.stopPropagation();if(last)render(inspect(last));}
    });
    overlay.addEventListener('pointerdown',event=>{
      const header=event.target?.closest?.('.dkds-theme-debug-header');
      if(!header||event.target?.closest?.('button,input,select,textarea,a'))return;
      const rect=overlay.getBoundingClientRect();
      dragState={pointerId:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};
      overlay.setPointerCapture?.(event.pointerId);
      overlay.classList.add('is-dragging');
      event.preventDefault();event.stopPropagation();
    });
    dragMoveHandler=event=>{if(!dragState||event.pointerId!==dragState.pointerId||!overlay)return;const x=event.clientX-dragState.dx,y=event.clientY-dragState.dy;placeOverlay(overlay,{x,y});event.preventDefault();};
    dragEndHandler=event=>{if(!dragState||event.pointerId!==dragState.pointerId)return;const rect=overlay?.getBoundingClientRect?.();if(rect)writePosition(rect.left,rect.top);overlay?.classList.remove('is-dragging');dragState=null;};
    overlay.addEventListener('pointermove',dragMoveHandler);overlay.addEventListener('pointerup',dragEndHandler);overlay.addEventListener('pointercancel',dragEndHandler);
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>placeOverlay(overlay));
    globalThis.DKDSMaterialSurface?.apply?.(overlay,'popover');
    return overlay;
  }
  function render(row){const host=ensureOverlay();host.hidden=isPaused();if(isPaused())return;if(pinned&&row?.element)lastTrace=traceElementOwnership(row.element);host.innerHTML=`<div class="dkds-theme-debug-header"><div><b>Theme Inspector</b> · ${esc(globalThis.DKDSTheme?.contractVersion||'')} ${pinned?'· PINNED':''}</div><button type="button" class="dkds-theme-debug-exit dkds-panel-close-button" data-dkds-component-variant="quiet" data-theme-debug-act="exit" aria-label="退出 Theme Inspector" title="退出 Theme Inspector"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div>`+
    `<div>Component: ${esc(row.componentName)}</div><div>Identity: ${esc(row.componentIdentity||'none')} ← ${esc(row.element?.dataset?.dkdsComponentIdentityOwner||'unknown')}</div><div>Variant / state: ${esc(row.componentVariant||'default')} / ${esc(row.componentState||'idle')}</div>`+
    `<div>Material role: ${esc(row.materialRole||'none')} ${row.expectedMaterialRole?`(expected ${esc(row.expectedMaterialRole)})`:''}</div><div>Material recipe: ${esc(row.materialRecipe||'none')} ${row.expectedMaterialRecipe?`(policy ${esc(row.expectedMaterialRecipe)})`:''}</div><div>Base token: ${esc(row.materialBaseToken||'none')}</div><div>Occlusion source: ${esc(row.occlusionSource||'none')}</div><div>Occluding child: ${esc(row.occludingChild||'none')}</div><div>Opaque ancestor (diagnostic only): ${esc(row.opaqueAncestor?`${row.opaqueAncestor.tag||''}${row.opaqueAncestor.id?`#${row.opaqueAncestor.id}`:''}.${row.opaqueAncestor.className||''}`:'none')}</div>`+
    `<div>Appearance slot: ${esc(row.appearanceSlot||'none')}</div><div>Resolved token: ${esc(row.resolvedTokenName||'none')} → ${esc(row.resolvedTokenValue||'')}</div><div>Token source: ${esc(row.resolvedTokenSource||'none')} · Theme: ${esc(row.sourceTheme||'')}</div>`+
    `<div>Computed background: ${esc(row.computedBackground||'')}</div><div>Computed text: ${esc(row.computedTextColor||'')}</div><div>Computed border: ${esc(row.computedBorder||'')}</div><div>Computed backdrop: ${esc(row.computedBackdropFilter||'none')}</div>`+
    `<div>Renderer: ${esc(row.rendererStatus||'')}</div><div>Status: <b>${esc(row.statuses.join(', '))}</b></div>${pinned?styleTraceHtml(lastTrace):'<div class="dkds-theme-trace-empty">Click to pin this element and run Geometry / Paint / Motion / lifecycle ownership trace.</div>'}<div class="dkds-theme-debug-hint">click pin/unpin · Esc 退出 · DevTool → Theme 管理</div>`;}
  function enable(){
    if(enabled)return true;enabled=true;pinned=false;lastTrace=null;traceFilter='all';gateAuditRelease=StyleGate.acquireRuntimeAudit?.('theme-inspector')||null;ensureOverlay();
    moveHandler=event=>{if(isPaused()||pinned)return;const row=inspect(event.target);if(row.element===last)return;last=row.element||event.target;render(row);};
    clickHandler=event=>{if(isPaused()||event.target===overlay||event.target?.closest?.('.dkds-theme-debug-overlay,.dkds-plugin-devtools,#statusBar .devtools-status-item'))return;pinned=!pinned;const row=inspect(event.target);last=row.element||event.target;render(row);event.preventDefault();event.stopPropagation();};
    keyHandler=event=>{if(event.key!=='Escape'||isPaused())return;disable();event.preventDefault();event.stopPropagation();};
    document.addEventListener('pointermove',moveHandler,{passive:true,capture:true});document.addEventListener('click',clickHandler,true);globalThis.addEventListener('keydown',keyHandler,true);render(inspect(document.body));return true;
  }
  function disable(){if(!enabled){pauseOwners.clear();dragState=null;gateAuditRelease?.();gateAuditRelease=null;overlay?.remove?.();overlay=null;return true;}enabled=false;pinned=false;lastTrace=null;dragState=null;pauseOwners.clear();gateAuditRelease?.();gateAuditRelease=null;if(moveHandler)document.removeEventListener('pointermove',moveHandler,{capture:true});if(clickHandler)document.removeEventListener('click',clickHandler,true);if(keyHandler)globalThis.removeEventListener('keydown',keyHandler,true);moveHandler=clickHandler=keyHandler=null;last=null;overlay?.remove?.();overlay=null;return true;}
  function pause(owner='external'){pauseOwners.add(String(owner||'external'));if(overlay)overlay.hidden=true;return true;}
  function resume(owner='external'){pauseOwners.delete(String(owner||'external'));if(enabled&&!isPaused()){ensureOverlay().hidden=false;render(last?inspect(last):inspect(document.body));}return true;}
  function toggle(){return enabled?disable():enable();}
  window.DKDSThemeDebug=Object.freeze({version:VERSION,enable,disable,pause,resume,toggle,inspect,traceOwnership,traceStyleOwner,traceElementOwnership,auditStyleOwnership,diagnosticSources,copyDiagnosticSource,currentTrace:()=>lastTrace,traceFilter:()=>traceFilter,isEnabled:()=>enabled,isPaused,isPinned:()=>pinned});
})();
