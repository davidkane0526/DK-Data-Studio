(() => {
  'use strict';
  const VERSION='3.10.0';
  const Semantic=globalThis.DKDSSemanticUI;
  if(!Semantic)throw new Error('DKDSSemanticUI is required before ThemeMaterialRenderer.');
  const STRONG_ROLES=new Set(['elevated','popover','floating']);
  const MATERIAL_RECIPES=Object.freeze(['clear','thin-glass','soft-glass','liquid-glass']);
  const MATERIAL_CONTEXTS=Object.freeze(globalThis.DKDSThemeContract?.materialContexts?.()||['compact','panel','dialog','workspace-modal']);
  const MATERIAL_CONTEXT_VAR_MAP=Object.freeze({materialBlur:'--dkds-material-blur',materialBlurStrong:'--dkds-material-blur-strong',materialSaturation:'--dkds-material-saturation',materialTintOpacity:'--dkds-material-authored-opacity',specularHighlight:'--dkds-material-specular',innerHighlight:'--dkds-material-inner',glassEdge:'--dkds-material-edge',materialNoiseOpacity:'--dkds-material-noise'});
  const ROLE_BASE_TOKENS=Object.freeze({
    chrome:{token:'appearance.roles.chrome.surface',cssVar:'--dkui-role-chrome-surface',fallbackToken:'surfaceElevated',fallbackVar:'--dkui-surface-elevated'},
    sidebar:{token:'appearance.roles.sidebar.surface',cssVar:'--dkui-role-sidebar-surface',fallbackToken:'surfaceSidebar',fallbackVar:'--dkui-surface-sidebar'},
    surface:{token:'appearance.roles.surface.surface',cssVar:'--dkui-role-surface-surface',fallbackToken:'surface',fallbackVar:'--dkui-surface'},
    elevated:{token:'appearance.roles.elevated.surface',cssVar:'--dkui-role-elevated-surface',fallbackToken:'surfaceElevated',fallbackVar:'--dkui-surface-elevated'},
    popover:{token:'appearance.roles.popover.surface',cssVar:'--dkui-role-popover-surface',fallbackToken:'surfaceElevated',fallbackVar:'--dkui-surface-elevated'},
    floating:{token:'appearance.roles.floating.surface',cssVar:'--dkui-role-floating-surface',fallbackToken:'surfaceElevated',fallbackVar:'--dkui-surface-elevated'},
    control:{token:'appearance.roles.control.surface',cssVar:'--dkui-role-control-surface',fallbackToken:'controlBg',fallbackVar:'--dkui-control-bg'}
  });
  const recipePolicy=()=>Object.freeze({...(globalThis.DKDSTheme?.recipePolicy?.()||{})});
  const materialContextOf=el=>Semantic.materialContextOf?.(el)||'';
  const resolvedMaterialTokens=(role,context)=>{const profile=globalThis.DKDSTheme?.preview?.()||{},contract=globalThis.DKDSThemeContract;return contract?.resolveMaterialContext?.(profile.material||{},role,context)||Object.freeze({});};
  function applyMaterialContextTokens(el,role,context){if(!el?.style)return;for(const cssVar of Object.values(MATERIAL_CONTEXT_VAR_MAP))el.style.removeProperty(cssVar);const values=resolvedMaterialTokens(role,context);for(const [key,cssVar] of Object.entries(MATERIAL_CONTEXT_VAR_MAP)){const value=values?.[key];if(value!==undefined&&value!=='')el.style.setProperty(cssVar,String(value));}if(context){setData(el,'dkdsMaterialContext',context);if(!el.dataset.dkdsMaterialContextOwner)setData(el,'dkdsMaterialContextOwner','core-runtime');}else if(el.dataset.dkdsMaterialContextOwner==='core-runtime'){delete el.dataset.dkdsMaterialContext;delete el.dataset.dkdsMaterialContextOwner;}return values;}
  const LIQUID_ROLES=new Set(['popover','floating']);
  const recipeOf=el=>{const role=roleOf(el);if(!role)return '';const explicit=String(el?.dataset?.dkdsMaterialRecipe||'').trim();if(explicit&&el?.dataset?.dkdsMaterialRecipeOwner!=='core-runtime')return explicit;const context=materialContextOf(el);return String(globalThis.DKDSTheme?.recipeFor?.(role,context)||recipePolicy()[role]||explicit||'').trim();};
  const roleOf=el=>String(getComputedStyle(el).getPropertyValue('--dkds-material-role')||'').trim().replace(/["']/g,'');
  const prop=(style,name)=>String(style?.getPropertyValue?.(name)||'').trim();
  const backdropOf=style=>String(style?.backdropFilter||style?.webkitBackdropFilter||prop(style,'backdrop-filter')||prop(style,'-webkit-backdrop-filter')||'').trim();
  const px=value=>{const m=String(value||'').match(/(-?[\d.]+)px/i);return m?Number(m[1]):0;};
  const ROLE_CLASS_PREFIX='dkds-material-role-';
  const ROLE_CLASSES=Object.freeze((globalThis.DKDSThemeContract?.materialRoles?.()||[]).map(role=>`${ROLE_CLASS_PREFIX}${role}`));
  function explicitRole(el){const owner=String(el?.dataset?.dkdsMaterialRoleClassOwner||'');return ROLE_CLASSES.find(cls=>el?.classList?.contains(cls)&&owner!=='core-runtime')||'';}
  const INTEGRATED_CHILD_SELECTOR='.dkds-integrated-action-group button,.panel-header-actions button,.trend-header-actions button,.dkds-plot-view-actions button,.statusbar-command-cluster button,.toolbar-group button,.primary-activity-cluster button,.system-core-tools-group button,[data-dkds-material-integrated="true"] button,.dkds-scientific-nav-tools button';
  const semanticControlOwnsPaint=el=>Semantic.semanticControlOwnsPaint(el);
  const chromeOwnedIntegrated=el=>Semantic.chromeOwnedIntegrated(el);
  const MATERIAL_OWNER_SELECTOR='[data-dkds-material-role="sidebar"],.dkds-material-role-sidebar,[data-dkds-material-role="surface"],.dkds-material-role-surface,[data-dkds-material-role="elevated"],.dkds-material-role-elevated,[data-dkds-material-role="floating"],.dkds-material-role-floating';
  const NESTED_HEADER_SELECTOR='.analysis-page-header,.dkds-analysis-header,.plugin-manager-header,.dkds-surface-header,.floating-header,.trend-card-header,.analysis-chart-title,.dkds-chart-head,.dkds-plot-view-head,.dkds-group-plot-head,.dkds-analysis-prime-head';
  function parentMaterialRole(el){
    let parent=el?.parentElement||null,depth=0;
    while(parent&&parent!==document.body&&parent!==document.documentElement&&depth<6){
      if(parent.matches?.(MATERIAL_OWNER_SELECTOR)){
        for(const role of ['sidebar','surface','elevated','floating'])if(parent.matches?.(`[data-dkds-material-role="${role}"],.dkds-material-role-${role}`))return role;
      }
      parent=parent.parentElement;depth++;
    }
    return '';
  }
  function nestedParentOwnsChrome(el){
    if(!el?.matches?.(NESTED_HEADER_SELECTOR))return false;
    return !!parentMaterialRole(el);
  }
  function inferRole(el){if(nestedParentOwnsChrome(el))return '';return Semantic.resolveMaterialRole(el);}
  function inferRecipe(el,role){
    if(!role)return '';
    if(role==='control'&&el.matches?.(INTEGRATED_CHILD_SELECTOR))return '';
    const context=materialContextOf(el);return globalThis.DKDSTheme?.recipeFor?.(role,context)||recipePolicy()[role]||'';
  }
  const hasClass=(el,cls)=>!!el?.classList?.contains?.(cls);
  const addClass=(el,cls)=>{if(!hasClass(el,cls)){el.classList.add(cls);return true;}return false;};
  const removeClass=(el,cls)=>{if(hasClass(el,cls)){el.classList.remove(cls);return true;}return false;};
  const setData=(el,key,value)=>{const next=String(value??'');if(String(el?.dataset?.[key]??'')!==next)el.dataset[key]=next;};
  function ownership(el,expectedRole=''){
    const expected=String(expectedRole||''),actual=roleOf(el);
    if(expected==='control'&&semanticControlOwnsPaint(el))return Object.freeze({managed:true,status:'MATERIAL_SEMANTIC_OVERRIDE',role:actual||'semantic-control',expectedRole:expected});
    if(expected==='control'&&el?.matches?.(INTEGRATED_CHILD_SELECTOR))return Object.freeze({managed:true,status:'MATERIAL_CHROME_OWNED',role:actual||'integrated-hit-region',expectedRole:expected});
    if(expected==='control'&&chromeOwnedIntegrated(el))return Object.freeze({managed:true,status:'MATERIAL_CHROME_OWNED',role:actual||'chrome-owned-control',expectedRole:expected});
    if(expected==='chrome'&&nestedParentOwnsChrome(el))return Object.freeze({managed:true,status:'MATERIAL_PARENT_OWNED',role:actual||'parent-owned-chrome',expectedRole:expected});
    return Object.freeze({managed:!!actual&&(!expected||actual===expected),status:actual&&(!expected||actual===expected)?'MATERIAL_ROLE_OWNED':'ROLE_MISSING',role:actual,expectedRole:expected});
  }
  function assignSemanticRole(el){
    if(!el?.classList)return '';
    // Chrome owns integrated command hit regions. Remove invalid nested control
    // material unless a caller explicitly opts into an independent surface.
    if(chromeOwnedIntegrated(el)&&el.dataset.dkdsMaterialSurface!=='core'&&el.classList.contains('dkds-material-role-control')){
      el.classList.remove('dkds-material-role-control');
      if(el.dataset.dkdsMaterialRoleClassOwner==='core-runtime')delete el.dataset.dkdsMaterialRoleClassOwner;
      if(el.dataset.dkdsMaterialRecipeOwner==='core-runtime'){delete el.dataset.dkdsMaterialRecipe;delete el.dataset.dkdsMaterialRecipeOwner;}
      if(el.dataset.dkdsMaterialAssignedRole==='control'){delete el.dataset.dkdsMaterialAssigned;delete el.dataset.dkdsMaterialAssignedRole;delete el.dataset.dkdsMaterialRole;}
    }
    const roleClassOwner=String(el.dataset.dkdsMaterialRoleClassOwner||'');
    const explicit=explicitRole(el),role=explicit?explicit.slice(ROLE_CLASS_PREFIX.length):inferRole(el),previous=String(el.dataset.dkdsMaterialAssignedRole||'');
    if(previous&&previous!==role&&roleClassOwner==='core-runtime')removeClass(el,`${ROLE_CLASS_PREFIX}${previous}`);
    if(role){
      if(!explicit){
        addClass(el,`${ROLE_CLASS_PREFIX}${role}`);
        setData(el,'dkdsMaterialRoleClassOwner','core-runtime');
      }
      setData(el,'dkdsMaterialAssigned','core-runtime');setData(el,'dkdsMaterialAssignedRole',role);setData(el,'dkdsMaterialRole',role);
      const context=materialContextOf(el);applyMaterialContextTokens(el,role,context);
      const recipe=inferRecipe(el,role);
      if(recipe){
        setData(el,'dkdsMaterialRecipe',recipe);setData(el,'dkdsMaterialRecipeOwner','core-runtime');
        try{
          if(recipe==='liquid-glass'){
            if(!hasClass(el,'dkds-optical-position-anchor')&&getComputedStyle(el).position==='static')addClass(el,'dkds-optical-position-anchor');
          }else removeClass(el,'dkds-optical-position-anchor');
        }catch{}
      }
      else if(el.dataset.dkdsMaterialRecipeOwner==='core-runtime'){
        delete el.dataset.dkdsMaterialRecipe;delete el.dataset.dkdsMaterialRecipeOwner;removeClass(el,'dkds-optical-position-anchor');
      }
    }
    else if(previous){
      if(roleClassOwner==='core-runtime')removeClass(el,`${ROLE_CLASS_PREFIX}${previous}`);
      delete el.dataset.dkdsMaterialAssigned;delete el.dataset.dkdsMaterialAssignedRole;delete el.dataset.dkdsMaterialRole;
      if(roleClassOwner==='core-runtime')delete el.dataset.dkdsMaterialRoleClassOwner;
      if(el.dataset.dkdsMaterialRecipeOwner==='core-runtime'){delete el.dataset.dkdsMaterialRecipe;delete el.dataset.dkdsMaterialRecipeOwner;removeClass(el,'dkds-optical-position-anchor');}
      applyMaterialContextTokens(el,'','');
    }
    return role;
  }
  const PERF={assignCalls:0,flushes:0,scheduleCalls:0,mutationRecords:0,ignoredClassMutations:0,ignoredNonHtml:0};
  function assignSemanticRoles(root=document,{syncSemantic=true}={}){
    PERF.assignCalls++;
    if(!root?.querySelectorAll)return Object.freeze({assigned:0});
    if(syncSemantic)Semantic.assign(root);
    const nodes=new Set();
    for(const area of Semantic.materialAreas())try{for(const el of root.querySelectorAll(area.selector))nodes.add(el);}catch{}
    try{for(const el of root.querySelectorAll(ROLE_CLASSES.map(cls=>`.${cls}`).join(',')))nodes.add(el);}catch{}
    if(root.nodeType===1)nodes.add(root);
    let assigned=0;for(const el of nodes)if(assignSemanticRole(el))assigned++;
    return Object.freeze({assigned});
  }
  const pendingRoleRoots=new Set();
  let roleFrame=0,assignmentEnabled=false;
  const requestFrame=fn=>(globalThis.requestAnimationFrame||((cb)=>setTimeout(cb,0)))(fn);
  function flushRoleAssignments(){
    roleFrame=0;PERF.flushes++;
    if(!assignmentEnabled||!pendingRoleRoots.size)return;
    const roots=[...pendingRoleRoots];pendingRoleRoots.clear();
    for(const root of roots)assignSemanticRoles(root,{syncSemantic:false});
  }
  function scheduleRoleAssignment(root=document){
    PERF.scheduleCalls++;
    if(!root?.querySelectorAll)return;
    if(root===document){pendingRoleRoots.clear();pendingRoleRoots.add(document);}
    else if(!pendingRoleRoots.has(document)){
      let candidate=root,covered=false;
      for(const existing of [...pendingRoleRoots]){
        if(existing===candidate||existing?.contains?.(candidate)){covered=true;break;}
        if(candidate?.contains?.(existing)){pendingRoleRoots.delete(existing);continue;}
        if(existing?.parentElement&&existing.parentElement===candidate?.parentElement){pendingRoleRoots.delete(existing);candidate=candidate.parentElement;}
      }
      if(!covered)pendingRoleRoots.add(candidate);
    }
    if(!assignmentEnabled||roleFrame)return;
    roleFrame=requestFrame(flushRoleAssignments);
  }
  function enableAssignmentsAfterFirstPaint(){
    requestFrame(()=>requestFrame(()=>{
      assignmentEnabled=true;
      scheduleRoleAssignment(document);
      refreshDerivedContrast();
    }));
  }

  function applyMaterialSurface(el,role){
    if(!el?.classList)throw new Error('MaterialSurface requires a DOM element.');
    const normalized=String(role||'').trim();
    if(!ROLE_CLASSES.includes(`${ROLE_CLASS_PREFIX}${normalized}`))throw new Error(`Unknown Material Role: ${normalized||'(empty)'}`);
    for(const cls of ROLE_CLASSES)el.classList.remove(cls);
    el.classList.add(`${ROLE_CLASS_PREFIX}${normalized}`);
    el.dataset.dkdsMaterialSurface='core';
    el.dataset.dkdsMaterialRoleClassOwner='material-surface';
    delete el.dataset.dkdsMaterialAssigned;
    delete el.dataset.dkdsMaterialAssignedRole;
    assignSemanticRole(el);
    return el;
  }
  function createMaterialSurface(role,{tag='div',className='',attributes={}}={}){
    const el=document.createElement(String(tag||'div'));
    if(className)el.className=String(className);
    for(const [key,value] of Object.entries(attributes||{})){if(value!==undefined&&value!==null)el.setAttribute(key,String(value));}
    return applyMaterialSurface(el,role);
  }

  const parseRgb=value=>{const m=String(value||'').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)%?)?\s*\)/i);if(!m)return null;let a=m[4]==null?1:Number(m[4]);if(String(m[4]||'').includes('%'))a/=100;return {r:Number(m[1]),g:Number(m[2]),b:Number(m[3]),a:Number.isFinite(a)?a:1};};
  const mix=(fg,bg)=>{const a=Math.max(0,Math.min(1,fg?.a??1));return {r:(fg.r*a)+(bg.r*(1-a)),g:(fg.g*a)+(bg.g*(1-a)),b:(fg.b*a)+(bg.b*(1-a)),a:1};};
  const lum=c=>{const f=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  function resolveCssColor(expression,property='color'){
    if(!document?.body)return null;const el=document.createElement('span');el.setAttribute('aria-hidden','true');el.style.cssText='position:fixed;left:-10000px;top:-10000px;pointer-events:none';el.style[property]=expression;document.body.appendChild(el);try{return parseRgb(getComputedStyle(el)[property]);}finally{el.remove();}
  }
  function refreshDerivedContrast(){
    if(!document?.body)return Object.freeze({ready:false});
    const canvas=resolveCssColor('var(--dkui-canvas)','backgroundColor')||{r:255,g:255,b:255,a:1};
    const probe=document.createElement('div');probe.className='dkds-material-role-popover';probe.setAttribute('aria-hidden','true');probe.style.cssText='position:fixed;left:-10000px;top:-10000px;width:8px;height:8px;pointer-events:none';document.body.appendChild(probe);
    let base0=null;try{base0=parseRgb(getComputedStyle(probe).backgroundColor);}finally{probe.remove();}
    base0=base0||resolveCssColor('var(--dkui-surface-elevated)','backgroundColor')||canvas;const base=mix(base0,canvas);
    const semantic=resolveCssColor('var(--dkui-role-popover-text,var(--dkui-text))','color');
    const dark={r:17,g:24,b:39,a:1},light={r:248,g:250,b:252,a:1};
    const semanticRatio=semantic?contrast(semantic,base):0,darkRatio=contrast(dark,base),lightRatio=contrast(light,base);
    const chosen=semanticRatio>=4.5?semantic:(darkRatio>=lightRatio?dark:light),ratio=contrast(chosen,base);
    const css=`rgb(${Math.round(chosen.r)} ${Math.round(chosen.g)} ${Math.round(chosen.b)})`;
    document.documentElement.style.setProperty('--dkds-on-popover',css);
    document.documentElement.style.setProperty('--dkds-popover-contrast-ratio',ratio.toFixed(2));
    return Object.freeze({ready:true,color:css,contrastRatio:ratio});
  }
  function alphaOf(value){
    const s=String(value||'').trim();if(!s||s==='transparent')return 0;
    let m=s.match(/^rgba?\([^)]*\/\s*([\d.]+)(%)?\s*\)$/i);
    if(m){const n=Number(m[1]);return m[2]?n/100:n;}
    m=s.match(/^rgba\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([\d.]+)(%)?\s*\)$/i);
    if(m){const n=Number(m[1]);return m[2]?n/100:n;}
    m=s.match(/^color\(srgb\s+[^/)]*(?:\/\s*([\d.]+)(%)?\s*)?\)$/i);
    if(m){if(m[1]==null)return 1;const n=Number(m[1]);return m[2]?n/100:n;}
    return /^(?:rgb|rgba|color\(srgb)\(/i.test(s)?1:null;
  }
  let opticalFrame=0,opticalPending=null,opticalActive=null,opticalIdleTimer=0;
  const reduceMotion=()=>{try{return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;}catch{return false;}};
  function resetOptical(el){if(!el?.style)return;el.classList?.remove?.('dkds-optical-active');el.style.setProperty('--dkds-optical-x','50%');el.style.setProperty('--dkds-optical-y','18%');el.style.setProperty('--dkds-optical-shift-x','0px');el.style.setProperty('--dkds-optical-shift-y','0px');}
  function applyOpticalPointer(el,event){
    if(!el?.isConnected||recipeOf(el)!=='liquid-glass'||reduceMotion()){resetOptical(el);return;}
    const rect=el.getBoundingClientRect?.();if(!rect||rect.width<=0||rect.height<=0)return;el.classList?.add?.('dkds-optical-active');clearTimeout(opticalIdleTimer);opticalIdleTimer=setTimeout(()=>el.classList?.remove?.('dkds-optical-active'),180);
    const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
    const sx=(x-.5)*1.6,sy=(y-.5)*1.2;
    el.style.setProperty('--dkds-optical-x',`${(x*100).toFixed(2)}%`);el.style.setProperty('--dkds-optical-y',`${(y*100).toFixed(2)}%`);el.style.setProperty('--dkds-optical-shift-x',`${sx.toFixed(3)}px`);el.style.setProperty('--dkds-optical-shift-y',`${sy.toFixed(3)}px`);
  }
  function scheduleOpticalPointer(el,event){opticalPending={el,event};if(opticalFrame)return;const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));opticalFrame=raf(()=>{opticalFrame=0;const row=opticalPending;opticalPending=null;if(!row)return;if(opticalActive&&opticalActive!==row.el)resetOptical(opticalActive);opticalActive=row.el;applyOpticalPointer(row.el,row.event);});}
  function setupOpticalPointerResponse(){
    if(!document?.addEventListener)return Object.freeze({ready:false});
    document.addEventListener('pointermove',event=>{const el=event.target?.closest?.('[data-dkds-material-recipe="liquid-glass"]');if(el)scheduleOpticalPointer(el,event);else if(opticalActive){resetOptical(opticalActive);opticalActive=null;}},{passive:true});
    globalThis.addEventListener?.('blur',()=>{if(opticalActive){resetOptical(opticalActive);opticalActive=null;}});
    return Object.freeze({ready:true});
  }
  function engineCapabilities(){
    const css=globalThis.CSS;
    const supports=(name,value)=>{try{return !!css?.supports?.(name,value);}catch{return false;}};
    const standard=supports('backdrop-filter','blur(1px)'),webkit=supports('-webkit-backdrop-filter','blur(1px)');
    return Object.freeze({backdropFilter:standard,webkitBackdropFilter:webkit,colorMix:supports('color','color-mix(in srgb, red 50%, blue)'),radialGradient:supports('background-image','radial-gradient(circle, red, transparent)'),maskImage:supports('mask-image','radial-gradient(circle, transparent, black)')||supports('-webkit-mask-image','radial-gradient(circle, transparent, black)'),pointerEvents:'PointerEvent' in globalThis});
  }
  function recipeInstalled(){
    try{return prop(getComputedStyle(document.documentElement),'--dkds-material-renderer-version').replace(/["']/g,'')===VERSION;}catch{return false;}
  }
  function opaqueParentOf(el){
    let node=el?.parentElement||null,depth=0;
    while(node&&node!==document.body&&node!==document.documentElement&&depth<8){
      const style=getComputedStyle(node),alpha=alphaOf(style.backgroundColor);
      if(alpha!==null&&alpha>=.985){return Object.freeze({tag:String(node.tagName||'').toLowerCase(),id:String(node.id||''),className:String(node.className||''),backgroundColor:String(style.backgroundColor||''),alpha});}
      node=node.parentElement;depth++;
    }
    return null;
  }

  function occludingChildOf(el){
    const ownerRect=el?.getBoundingClientRect?.();if(!ownerRect||ownerRect.width<=0||ownerRect.height<=0)return null;
    const ownerArea=ownerRect.width*ownerRect.height;let best=null;
    const queue=[...(el.children||[])].map(node=>({node,depth:1}));
    while(queue.length){
      const {node,depth}=queue.shift();if(!node?.getBoundingClientRect)continue;
      // A nested canonical Material surface is intentional composition. Theme
      // Coverage checks that surface independently; it is not renderer occlusion
      // of its parent. Occlusion here means an unmanaged opaque content sheet.
      if(roleOf(node)||node.dataset?.dkdsMaterialSurface==='core')continue;
      const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')continue;
      const rect=node.getBoundingClientRect();if(rect.width<=0||rect.height<=0)continue;
      const width=Math.max(0,Math.min(ownerRect.right,rect.right)-Math.max(ownerRect.left,rect.left));
      const height=Math.max(0,Math.min(ownerRect.bottom,rect.bottom)-Math.max(ownerRect.top,rect.top));
      const coverage=(width*height)/ownerArea;
      if(coverage>=.72){
        const backgroundColor=String(style.backgroundColor||''),alpha=alphaOf(backgroundColor);
        if(alpha!==null&&alpha>=.985&&(!best||coverage>best.coverage))best={tag:String(node.tagName||'').toLowerCase(),id:String(node.id||''),className:String(node.className||''),backgroundColor,alpha,coverage:Number(coverage.toFixed(3)),depth};
      }
      if(depth<2)for(const child of [...(node.children||[])])queue.push({node:child,depth:depth+1});
    }
    return best?Object.freeze(best):null;
  }

  function inspect(el,expectedRole=''){
    if(!el||typeof getComputedStyle!=='function')return Object.freeze({status:'NO_ELEMENT',role:'',expectedRole,recipe:'clear'});
    const style=getComputedStyle(el),role=roleOf(el),context=materialContextOf(el),recipe=recipeOf(el),engine=engineCapabilities(),backdropFilter=backdropOf(style);
    const expectedBlur=prop(style,'--dkds-material-blur'),expectedBlurStrong=prop(style,'--dkds-material-blur-strong'),expectedSaturation=prop(style,'--dkds-material-saturation');
    const backgroundColor=String(style.backgroundColor||'').trim(),backgroundAlpha=alphaOf(backgroundColor),foregroundColor=String(style.color||'').trim();
    const baseTokenRow=ROLE_BASE_TOKENS[role]||null,authoredBase=baseTokenRow?prop(style,baseTokenRow.cssVar):'',baseToken=baseTokenRow?(authoredBase?`${baseTokenRow.token} / ${baseTokenRow.cssVar}`:`${baseTokenRow.fallbackToken} / ${baseTokenRow.fallbackVar}`):'',baseColor=baseTokenRow?(authoredBase||prop(style,baseTokenRow.fallbackVar)):'';
    const occludingChild=recipe&&recipe!=='clear'&&role!=='control'?occludingChildOf(el):null;
    let contrastRatio=null;
    if(role==='popover'){
      const fg=parseRgb(foregroundColor),bg0=parseRgb(backgroundColor),canvas=resolveCssColor('var(--dkui-canvas)','backgroundColor')||{r:255,g:255,b:255,a:1};
      if(fg&&bg0){const bg=mix(bg0,canvas);contrastRatio=contrast(fg,bg);}
    }
    let edgeBackdropFilter='',edgeTransform='',specularBackground='';
    if(recipe==='liquid-glass'){
      try{const edge=getComputedStyle(el,'::before'),specular=getComputedStyle(el,'::after');edgeBackdropFilter=backdropOf(edge);edgeTransform=String(edge.transform||'').trim();specularBackground=String(specular.backgroundImage||'').trim();}catch{}
    }
    const opaqueParent=recipe&&recipe!=='clear'?opaqueParentOf(el):null;
    let status='REAL_MATERIAL',opticalStatus=recipe==='clear'?'CLEAR_MATERIAL':recipe==='thin-glass'?'THIN_GLASS':recipe==='soft-glass'?'SOFT_GLASS':'LIQUID_GLASS';
    if(expectedRole&&role!==expectedRole)status='ROLE_MISSING';
    else if(!role)status='ROLE_MISSING';
    else if(!recipe||!MATERIAL_RECIPES.includes(recipe))status='RECIPE_MISSING';
    else if(!recipeInstalled())status='BROKEN_MATERIAL_RENDERER';
    else if(el.matches?.('.primary,.strong,[data-dkds-material-opaque="true"]'))status='MATERIAL_SEMANTIC_OVERRIDE';
    else if(recipe!=='clear'&&!engine.backdropFilter&&!engine.webkitBackdropFilter)status='ENGINE_UNSUPPORTED';
    else if((recipe==='thin-glass'||recipe==='soft-glass')&&px(prop(style,'--dkds-material-blur'))>0&&!/blur\(\s*(?!0(?:px)?\b)[^)]+\)/i.test(backdropFilter))status='BACKDROP_FILTER_NONE';
    else if(recipe==='liquid-glass'){
      const baseBlur=prop(style,'--dkds-material-blur'),edgeBlur=prop(style,'--dkds-material-blur-strong');
      if(px(baseBlur)>0&&!/blur\(\s*(?!0(?:px)?\b)[^)]+\)/i.test(backdropFilter))status='BROKEN_MATERIAL_RENDERER';
      else if(px(edgeBlur)>0&&!/blur\(\s*(?!0(?:px)?\b)[^)]+\)/i.test(edgeBackdropFilter)){status='BROKEN_OPTICAL_RENDERER';opticalStatus='BROKEN_EDGE_REFRACTION';}
      else if(!specularBackground||specularBackground==='none'){status='BROKEN_OPTICAL_RENDERER';opticalStatus='BROKEN_SPECULAR';}
      else opticalStatus='REAL_LIQUID_MATERIAL';
    }
    else if(recipe==='clear')opticalStatus='REAL_CLEAR_MATERIAL';
    else if(recipe==='thin-glass')opticalStatus='REAL_THIN_GLASS';
    else opticalStatus='REAL_SOFT_MATERIAL';
    // Plugin API 1.19 exposes the legacy OPAQUE_PARENT_OCCLUSION status name.
    // Preserve that public enum, but do not treat an opaque ancestor alone as
    // renderer failure: backdrop-filter can still sample sibling/content pixels
    // inside that ancestor. Real occlusion is an opaque repaint of the Material
    // itself or an unmanaged opaque descendant covering most of its optical area.
    let occlusionSource='';
    if(status==='REAL_MATERIAL'&&recipe!=='clear'&&backgroundAlpha!==null&&backgroundAlpha>=.985){status='OPAQUE_PARENT_OCCLUSION';occlusionSource='self';}
    if(status==='REAL_MATERIAL'&&recipe!=='clear'&&occludingChild){status='OPAQUE_PARENT_OCCLUSION';occlusionSource='child';}
    if(status==='REAL_MATERIAL'&&role==='popover'&&Number.isFinite(contrastRatio)&&contrastRatio<4.5)status='LOW_CONTRAST_MATERIAL';
    return Object.freeze({status,opticalStatus,role,context,expectedRole,recipe,baseToken,baseColor,expectedBlur,expectedBlurStrong,expectedSaturation,backdropFilter,edgeBackdropFilter,edgeTransform,specularBackground,backgroundColor,backgroundAlpha,foregroundColor,contrastRatio,opaqueParent,occludingChild,occlusionSource,recipeInstalled:recipeInstalled(),engine});
  }
  function probeRole(role){
    if(!document?.body)return Object.freeze({role,status:'NO_BODY'});
    const el=document.createElement('div');el.className=`dkds-material-role-${role}`;el.setAttribute('aria-hidden','true');el.style.cssText='position:fixed;left:-10000px;top:-10000px;width:20px;height:20px;pointer-events:none';document.body.appendChild(el);assignSemanticRole(el);
    try{return inspect(el,role);}finally{el.remove();}
  }
  function probeRecipe(recipe,role=recipe==='liquid-glass'?'popover':recipe==='thin-glass'?'popover':recipe==='soft-glass'?'sidebar':'surface'){
    if(!document?.body)return Object.freeze({recipe,status:'NO_BODY'});const el=document.createElement('div');el.className=`dkds-material-role-${role}`;el.dataset.dkdsMaterialRecipe=recipe;el.dataset.dkdsMaterialRecipeOwner='capability-probe';el.setAttribute('aria-hidden','true');el.style.cssText='position:fixed;left:-10000px;top:-10000px;width:20px;height:20px;pointer-events:none';document.body.appendChild(el);try{return inspect(el,role);}finally{el.remove();}
  }
  function capabilities(){
    const engine=engineCapabilities(),installed=recipeInstalled(),roles={};
    for(const role of (window.DKDSThemeContract?.materialRoles?.()||[])){const row=probeRole(role);roles[role]=!['BROKEN_MATERIAL_RENDERER','BROKEN_OPTICAL_RENDERER','MISSING_MATERIAL_ROLE','ENGINE_UNSUPPORTED'].includes(row.status);}
    const thinProbe=probeRecipe('thin-glass','popover'),softProbe=probeRecipe('soft-glass','sidebar'),liquidProbe=probeRecipe('liquid-glass','popover');
    const recipes={clear:true,'thin-glass':thinProbe.status==='REAL_MATERIAL','soft-glass':softProbe.status==='REAL_MATERIAL','liquid-glass':liquidProbe.opticalStatus==='REAL_LIQUID_MATERIAL'};
    const roleReady=Object.values(roles).length>0&&Object.values(roles).every(Boolean),liquidReady=recipes['liquid-glass']===true;
    const assignment=assignSemanticRoles(document),contrastGuard=refreshDerivedContrast();
    return Object.freeze({version:VERSION,engine,recipeInstalled:installed,policy:Object.freeze({roleToRecipe:recipePolicy(),recipes:MATERIAL_RECIPES}),renderer:Object.freeze({backdropBlur:installed&&(engine.backdropFilter||engine.webkitBackdropFilter)&&roleReady,saturation:installed&&(engine.backdropFilter||engine.webkitBackdropFilter)&&roleReady,noise:installed&&engine.radialGradient,glassEdge:installed,innerHighlight:installed,specularHighlight:installed,webMaterial:installed&&roleReady,nativeBlur:false,thinGlass:recipes['thin-glass']===true,semanticRoleAssignment:true,contrastGuard:contrastGuard.ready===true,nonUniformBlur:liquidReady,edgeRefraction:liquidReady&&engine.maskImage,dynamicSpecular:liquidReady&&engine.pointerEvents,liquidGlass:liquidReady,materialContexts:true}),recipes:Object.freeze(recipes),roles:Object.freeze(roles),materialContexts:Object.freeze(MATERIAL_CONTEXTS.slice()),assignment,contrastGuard});
  }
  function supports(feature){
    const key=String(feature||'').trim(),caps=capabilities();
    if(key==='renderer.backdropBlur')return caps.renderer.backdropBlur;
    if(key==='renderer.saturation')return caps.renderer.saturation;
    if(key==='renderer.noise')return caps.renderer.noise;
    if(key==='renderer.glassEdge')return caps.renderer.glassEdge;
    if(key==='renderer.innerHighlight')return caps.renderer.innerHighlight;
    if(key==='renderer.specularHighlight')return caps.renderer.specularHighlight;
    if(key==='renderer.webMaterial')return caps.renderer.webMaterial;
    if(key==='renderer.nativeBlur')return caps.renderer.nativeBlur;
    if(key==='renderer.thinGlass')return caps.renderer.thinGlass;
    if(key==='renderer.nonUniformBlur')return caps.renderer.nonUniformBlur;
    if(key==='renderer.edgeRefraction')return caps.renderer.edgeRefraction;
    if(key==='renderer.dynamicSpecular')return caps.renderer.dynamicSpecular;
    if(key==='renderer.liquidGlass')return caps.renderer.liquidGlass;
    if(key==='renderer.profilePolicy')return true;
    if(key==='renderer.materialContexts')return caps.renderer.materialContexts===true;
    if(key.startsWith('renderer.recipes.'))return caps.recipes[key.slice('renderer.recipes.'.length)]===true;
    if(key.startsWith('renderer.roles.'))return caps.roles[key.slice('renderer.roles.'.length)]===true;
    return false;
  }
  const MATERIAL_RUNTIME_CLASS_RE=/^(?:dkds-material-role-|dkds-optical-position-anchor$|dkds-optical-active$)/;
  const MATERIAL_CLASS_HINTS=Object.freeze(new Set([
    ...Semantic.materialAreas().flatMap(row=>[...String(row.selector||'').matchAll(/\.([A-Za-z0-9_-]+)/g)].map(match=>match[1])),
    ...ROLE_CLASSES,
    'is-floating','is-global-floating'
  ]));
  const materialClassRelevant=value=>String(value||'').split(/\s+/).some(cls=>MATERIAL_CLASS_HINTS.has(cls)||cls.startsWith('dkds-material-role-'));
  const htmlElement=el=>typeof HTMLElement==='undefined'||el instanceof HTMLElement;
  function semanticClassSignature(value){return String(value||'').split(/\s+/).filter(Boolean).filter(cls=>!MATERIAL_RUNTIME_CLASS_RE.test(cls)).sort().join(' ');}
  function bootAssignments(){
    setupOpticalPointerResponse();
    try{
      const observer=new MutationObserver(records=>{
        PERF.mutationRecords+=records.length;
        for(const record of records){
          if(record.type==='attributes'){
            const target=record.target;if(!htmlElement(target)){PERF.ignoredNonHtml++;continue;}
            if(record.attributeName==='class'){
              const nextClass=target?.getAttribute?.('class')||'';
              if(semanticClassSignature(record.oldValue)===semanticClassSignature(nextClass)){PERF.ignoredClassMutations++;continue;}
              if(!materialClassRelevant(record.oldValue)&&!materialClassRelevant(nextClass)&&!target?.dataset?.dkdsMaterialAssignedRole){PERF.ignoredClassMutations++;continue;}
            }
            if(record.attributeName==='data-dkds-material-context'){assignSemanticRole(target);continue;}
            scheduleRoleAssignment(target);continue;
          }
          for(const node of record.addedNodes||[]){if(node?.nodeType===1&&htmlElement(node))scheduleRoleAssignment(node);else if(node?.nodeType===1)PERF.ignoredNonHtml++;}
        }
      });
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-dkds-material-context'],attributeOldValue:true});
      globalThis.addEventListener?.('beforeunload',()=>observer.disconnect(),{once:true});
    }catch{}
    enableAssignmentsAfterFirstPaint();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootAssignments,{once:true});else bootAssignments();
  globalThis.addEventListener?.('dkds:theme-changed',()=>{refreshDerivedContrast();scheduleRoleAssignment(document);});
  globalThis.addEventListener?.('dkds:theme-profile-changed',()=>{refreshDerivedContrast();scheduleRoleAssignment(document);});
  const performanceSnapshot=()=>Object.freeze({...PERF,pendingRoots:pendingRoleRoots.size,framePending:!!roleFrame,assignmentEnabled});
  window.DKDSThemeMaterialRenderer=Object.freeze({version:VERSION,performance:performanceSnapshot,capabilities,supports,inspect,ownership,probeRole,probeRecipe,roleOf,recipeOf,assignSemanticRoles,refreshDerivedContrast,materialRecipes:()=>MATERIAL_RECIPES.slice(),materialContexts:()=>MATERIAL_CONTEXTS.slice(),materialContextOf,materialPolicy:()=>({...recipePolicy()}),materialSurface:Object.freeze({apply:applyMaterialSurface,create:createMaterialSurface})});
  window.DKDSMaterialSurface=Object.freeze({version:'1.0.0',apply:applyMaterialSurface,create:createMaterialSurface,inspect,roleOf,recipeOf});
})();
