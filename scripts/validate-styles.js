'use strict';
const fs=require('fs');
const path=require('path');
const {inspectPluginCss,collectCoreAliases}=require('../sdk/visual-contract');
const root=path.resolve(__dirname,'..');
const authored=[];
function collect(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())collect(p);else if(e.isFile()&&e.name.endsWith('.css'))authored.push(p);}}
collect(path.join(root,'src','styles'));
for(const rel of ['src/mobile.css','src/plugin-window/style.css']){const p=path.join(root,rel);if(fs.existsSync(p))authored.push(p);}
const plugins=path.join(root,'src','plugins');
if(fs.existsSync(plugins))for(const e of fs.readdirSync(plugins,{withFileTypes:true})){if(!e.isDirectory())continue;const p=path.join(plugins,e.name,'plugin.css');if(fs.existsSync(p))authored.push(p);}
function structuralBalance(text,file){
  let depth=0,quote='',comment=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
    if(!quote&&c==='/'&&n==='*'){comment=true;i++;continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'){depth--;if(depth<0)throw new Error(`${file}: unexpected }`);}
  }
  if(comment)throw new Error(`${file}: unterminated comment`);
  if(quote)throw new Error(`${file}: unterminated string`);
  if(depth!==0)throw new Error(`${file}: unbalanced braces (${depth})`);
}
const violations=[];
// CSS override debt must not hide inside runtime template strings.
const runtimeText=[];
for(const base of ['src/core','src/app','src/plugins']){
  const dir=path.join(root,base);if(!fs.existsSync(dir))continue;
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&/\.(?:js|inc)$/.test(e.name))runtimeText.push(p);}};walk(dir);
}
for(const file of runtimeText){const text=fs.readFileSync(file,'utf8');if(/!important\b/i.test(text))violations.push(`${path.relative(root,file)}: !important is forbidden in runtime-injected CSS.`);if(/setProperty\([^)]*['\"]important['\"]/i.test(text))violations.push(`${path.relative(root,file)}: inline style priority 'important' is forbidden; layered CSS and normal inline state must suffice.`);}
for(const file of authored){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const css=fs.readFileSync(file,'utf8');
  try{structuralBalance(css,rel);}catch(err){violations.push(err.message);}
  if(/!important\b/i.test(css))violations.push(`${rel}: !important is forbidden; use cascade ownership layers.`);
}
for(const legacy of ['src/styles/base','src/styles/modern'])if(fs.existsSync(path.join(root,legacy)))violations.push(`${legacy}: legacy specificity directory must not return.`);
const coreCss=authored.filter(p=>p.includes(`${path.sep}src${path.sep}styles${path.sep}`));
const pluginIdentity=/(?:\.ter-|\.pulse-|\.dc-|\.respar-|\.reswin-|\.resonance-|#ter\w*|#pulse\w*|#resonance\w*)/i;
for(const file of coreCss){const css=fs.readFileSync(file,'utf8');if(pluginIdentity.test(css))violations.push(`${path.relative(root,file)}: Core CSS contains plugin identity selector.`);}
const entry=fs.readFileSync(path.join(root,'src','core.css'),'utf8');
const foundationPath=path.join(root,'src','styles','foundation','foundation.css');
const utilityPath=path.join(root,'src','styles','utility','visibility.css');
const foundationCss=fs.existsSync(foundationPath)?fs.readFileSync(foundationPath,'utf8'):'';
const utilityCss=fs.existsSync(utilityPath)?fs.readFileSync(utilityPath,'utf8'):'';
if(/(^|[},])\s*\.hidden\s*\{\s*display\s*:\s*none/m.test(foundationCss))violations.push('src/styles/foundation/foundation.css: global hidden state must not live below structural display rules.');
if(!/:where\(\.hidden,\[hidden\]\)\s*\{\s*display\s*:\s*none\s*;?\s*\}/.test(utilityCss))violations.push('src/styles/utility/visibility.css: final utility layer must own .hidden/[hidden] display:none.');
for(const file of authored){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  if(rel==='src/styles/utility/visibility.css')continue;
  const css=fs.readFileSync(file,'utf8');
  if(/(?:^|[},])[^{}]*\.hidden\s*\{\s*display\s*:\s*none\s*;?\s*\}/m.test(css))violations.push(`${rel}: component-specific .hidden display ownership is forbidden; use the final utility layer.`);
}
if(!entry.includes('dkds.utility')||!entry.includes('styles/utility/visibility.css'))violations.push('src/core.css: final dkds.utility visibility layer is required.');
if(entry.includes('dkds.state')||entry.includes('styles/state/visibility.css'))violations.push('src/core.css: legacy dkds.state visibility layer must not return; use the paint-free dkds.utility layer.');
for(const layer of ['foundation','plugin','structure','presentation','theme','platform','window','utility'])if(!entry.includes(`dkds.${layer}`))violations.push(`src/core.css: missing dkds.${layer} cascade layer.`);
const superTopPath=path.join(root,'src','styles','structure','super-top-contract.css');
if(fs.existsSync(superTopPath)){
  const superTop=fs.readFileSync(superTopPath,'utf8');
  if(/\.dkds-analysis-(?:frame|left|main|right|bottom)\s*\{[^}]*grid-(?:column|row|template)/s.test(superTop))violations.push('src/styles/structure/super-top-contract.css: SUPER/TOP chrome must not own AnalysisWorkbench grid geometry.');
}
const structureDir=path.join(root,'src','styles','structure');
const shellNavigationRel='src/styles/structure/shell-navigation.css';
const shellOwnedSelectors=['workspace-commandbar','primary-activity-cluster','primary-activity-bar','activity-switcher','activity-bar','context-commandbar','plugin-context-toolbar'];
for(const file of coreCss.filter(p=>p.startsWith(structureDir+path.sep))){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  if(rel===shellNavigationRel)continue;
  const css=fs.readFileSync(file,'utf8');
  for(const selector of shellOwnedSelectors){
    const exact=new RegExp(`(?:^|})\\s*\\.${selector}\\s*\\{`,'m');
    if(exact.test(css))violations.push(`${rel}: .${selector} geometry belongs to shell-navigation.css.`);
  }
}
const shellNavigationCss=fs.readFileSync(path.join(root,shellNavigationRel),'utf8');
if(/\.plugin-manager-|\.plugin-card-|\.plugin-capability-chip/.test(shellNavigationCss))violations.push(`${shellNavigationRel}: plugin-manager typography/layout must stay with schema-and-plugin-ui.css.`);

// Final v3.62 style ownership gates.  A selector has one authored owner per
// structural/presentation layer; Foundation is reset-only; Structure is paint-free.
const presentationDir=path.join(root,'src','styles','presentation');
const structureDirFinal=path.join(root,'src','styles','structure');
const presentationFiles=fs.readdirSync(presentationDir).filter(name=>name.endsWith('.css')).sort();
const structureFiles=fs.readdirSync(structureDirFinal).filter(name=>name.endsWith('.css')).sort();
if(fs.existsSync(path.join(presentationDir,'workspace-theme-boundary.css')))violations.push('src/styles/presentation/workspace-theme-boundary.css: catch-all compatibility patch layer must not return.');
function splitSelectorList(text){
  const out=[];let start=0,paren=0,bracket=0,quote='';
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='\"'||c==="'"){quote=c;continue;}
    if(c==='(')paren++; else if(c===')')paren=Math.max(0,paren-1);
    else if(c==='[')bracket++; else if(c===']')bracket=Math.max(0,bracket-1);
    else if(c===','&&paren===0&&bracket===0){out.push(text.slice(start,i));start=i+1;}
  }
  out.push(text.slice(start));return out;
}
function ownedSelectors(css){
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const selectors=[];
  for(const match of clean.matchAll(/([^{}]+)\{/g)){
    const pre=match[1].trim();
    if(!pre||pre.startsWith('@'))continue;
    for(const raw of splitSelectorList(pre)){
      const selector=raw.replace(/\s+/g,' ').trim();
      if(!selector||selector.includes(';')||selector==='from'||selector==='to'||/^\d+(?:\.\d+)?%$/.test(selector))continue;
      selectors.push(selector);
    }
  }
  return selectors;
}
function assertSingleOwner(dir,files,label){
  const owners=new Map();
  for(const name of files){
    const css=fs.readFileSync(path.join(dir,name),'utf8');
    for(const selector of ownedSelectors(css)){
      if(!owners.has(selector))owners.set(selector,new Set());
      owners.get(selector).add(name);
    }
  }
  for(const [selector,names] of owners)if(names.size>1)violations.push(`${label}: selector "${selector}" has multiple owners: ${[...names].join(', ')}.`);
  return owners;
}
function semanticSelector(selector){
  let value=String(selector||'').trim(),previous='';
  const prefixes=[
    /^html\[data-dkds-theme="(?:dark|light)"\]\s+/,
    /^html\[data-dkds-theme-profile="[^"]+"\]\s+/,
    /^body\.dkds-modern-ui(?:\.plugin-window-host)?\s+/,
    /^\.dkds-plugin-window\s+/
  ];
  while(value&&value!==previous){previous=value;for(const prefix of prefixes)value=value.replace(prefix,'');}
  return value.trim();
}
function assertSingleSemanticOwner(dir,files,label){
  const owners=new Map();
  for(const name of files){
    const css=fs.readFileSync(path.join(dir,name),'utf8');
    for(const selector of new Set(ownedSelectors(css).map(semanticSelector).filter(Boolean))){
      if(!owners.has(selector))owners.set(selector,new Set());
      owners.get(selector).add(name);
    }
  }
  for(const [selector,names] of owners)if(names.size>1)violations.push(`${label}: semantic selector "${selector}" has multiple owners after Theme/host normalization: ${[...names].join(', ')}.`);
  return owners;
}
const presentationOwners=assertSingleOwner(presentationDir,presentationFiles,'presentation ownership');
const structureOwners=assertSingleOwner(structureDirFinal,structureFiles,'structure ownership');
assertSingleSemanticOwner(presentationDir,presentationFiles,'presentation semantic ownership');
assertSingleSemanticOwner(structureDirFinal,structureFiles,'structure semantic ownership');
assertNoSameSelectorPropertyOverride(structureDirFinal,structureFiles,'structure duplicate-property ownership');
assertNoSameSelectorPropertyOverride(presentationDir,presentationFiles,'presentation duplicate-property ownership');

// Shared command geometry follows a slot-based property-ownership contract.
// Context/state modifiers may change custom-property inputs, margins or separator
// composition, but they may not rewrite the command content box later in the
// same Structure layer. This prevents specificity/load-order patches such as a
// semantic section marker re-adding one-sided padding to a compact command.
const forbiddenCommandModifierGeometry=/^(?:padding(?:-(?:left|right|top|bottom|inline|inline-start|inline-end|block|block-start|block-end))?|height|min-height|max-height|line-height)$/i;
for(const name of structureFiles){
  const css=fs.readFileSync(path.join(structureDirFinal,name),'utf8');
  for(const block of ruleBlocks(css)){
    const selector=block.selector;
    const semanticModifier=/\.plugin-section-start\b/.test(selector);
    const stateModifier=/(?:\.active\b|\.selected\b|:hover\b|:active\b|:focus(?:-visible)?\b)/.test(selector)&&/(?:toolbar-btn|plugin-toolbar-btn|dkds-presentation-command)/.test(selector);
    if(!semanticModifier&&!stateModifier)continue;
    for(const [prop] of block.decls){
      const normalized=String(prop).trim().toLowerCase();
      if(forbiddenCommandModifierGeometry.test(normalized))violations.push(`src/styles/structure/${name}: command modifier "${selector}" rewrites ${normalized}. Shared command content-box geometry must be set through --dkds-command-* slots, never by a later modifier rule.`);
    }
  }
}

// Standard Core component geometry must remain property-owned even when a context
// or responsive state changes its values. Activity Tabs and Status Bar actions
// are especially sensitive because they coexist with generic button baselines.
const forbiddenActivityContentGeometry=/^(?:padding(?:-(?:left|right|top|bottom|inline|inline-start|inline-end|block|block-start|block-end))?|height|min-height|max-height|line-height)$/i;
const forbiddenStatusItemModifierGeometry=/^(?:padding(?:-(?:left|right|top|bottom|inline|inline-start|inline-end|block|block-start|block-end))?|height|min-height|max-height|gap|row-gap|column-gap|line-height)$/i;
for(const name of structureFiles){
  const css=fs.readFileSync(path.join(structureDirFinal,name),'utf8');
  for(const block of ruleBlocks(css)){
    const selector=block.selector;
    for(const [prop] of block.decls){
      const normalized=String(prop).trim().toLowerCase();
      if(/\.activity-tab\b/.test(selector)&&forbiddenActivityContentGeometry.test(normalized)){
        const canonical=name==='shell-navigation.css'&&selector==='.activity-tab';
        if(!canonical)violations.push(`src/styles/structure/${name}: Activity Tab context "${selector}" rewrites ${normalized}. The .activity-tab content box belongs to shell-navigation.css; contexts must set --dkds-activity-* slots.`);
      }
      if(/\.plugin-status-item\b/.test(selector)&&forbiddenStatusItemModifierGeometry.test(normalized)){
        const canonical=name==='super-top-contract.css'&&selector==='.plugin-status-item';
        if(!canonical)violations.push(`src/styles/structure/${name}: Status item context "${selector}" rewrites ${normalized}. Status item geometry must flow through --dkds-status-item-* slots.`);
      }
      if(/\.statusbar(?=$|[.#:\[\s,>{+~])/.test(selector)&&/^(?:height|min-height|max-height|padding(?:-.+)?|gap|row-gap|column-gap)$/i.test(normalized)){
        const canonical=name==='super-top-contract.css'&&selector==='#statusBar.statusbar';
        if(!canonical)violations.push(`src/styles/structure/${name}: Status Bar context "${selector}" rewrites ${normalized}. Desktop Status Bar geometry belongs to #statusBar.statusbar in super-top-contract.css and its --dkds-statusbar-* slots.`);
      }
      if(/\.project-tab(?=$|[.#:\[\s,>{+~])/.test(selector)&&/^(?:height|min-height|max-height|min-width|padding(?:-.+)?)$/i.test(normalized)){
        const canonical=name==='schema-and-plugin-ui.css'&&selector==='.project-tab';
        if(!canonical)violations.push(`src/styles/structure/${name}: Project Tab context "${selector}" rewrites ${normalized}. Project Tab content-box geometry must flow through --dkds-project-tab-* slots.`);
      }
      if(/\.project-tabs-bar(?=$|[.#:\[\s,>{+~])/.test(selector)&&/^(?:height|min-height|max-height|padding(?:-.+)?|gap)$/i.test(normalized)){
        const canonical=name==='schema-and-plugin-ui.css'&&selector==='.project-tabs-bar';
        if(!canonical)violations.push(`src/styles/structure/${name}: Project Tabs Bar context "${selector}" rewrites ${normalized}. Project Tabs chrome geometry must flow through --dkds-project-tabs-* slots.`);
      }
      if(/button[^,{]*(?::hover|:active|:focus(?:-visible)?)/.test(selector)&&normalized==='transform')violations.push(`src/styles/structure/${name}: interactive button state "${selector}" changes transform. Core interaction paint/motion must not move control geometry in Structure.`);
    }
  }
}


// R7R extends property ownership from shell commands/tabs to reusable Core
// surfaces. The shared hit box, semantic field density, scientific floating
// chrome and PortableView placement modes must not regress to source-order
// overrides in another Structure file.
const portablePlacementGeometry=/^(?:position|inset|left|right|top|bottom|width|min-width|max-width|height|min-height|max-height|overflow|overflow-x|overflow-y|resize|z-index|align-self|margin|flex)$/i;
const headerActionHitGeometry=/^(?:height|min-height)$/i;
const fieldDensityGeometry=/^(?:height|min-height|padding|padding-block|padding-inline|padding-top|padding-right|padding-bottom|padding-left|line-height)$/i;
for(const name of structureFiles){
  const css=fs.readFileSync(path.join(structureDirFinal,name),'utf8');
  for(const block of ruleBlocks(css)){
    const selector=block.selector;
    for(const [prop] of block.decls){
      const normalized=String(prop).trim().toLowerCase();
      if(headerActionHitGeometry.test(normalized)&&/(?:\.dkds-portable-icon-action\b|\.dkds-panel-close-button\b|\.dkds-portable-placement-trigger\b|\.dkds-plot-view-action\b|\.dkds-portable-history-action\b)/.test(selector)){
        const genericFallback=selector.startsWith('button:not(:is(');
        if(!genericFallback)violations.push(`src/styles/structure/${name}: portable/header action subtype "${selector}" rewrites ${normalized}. Header action hit height belongs to desktop-chrome-geometry.css and must be changed through --dkds-header-action-height.`);
      }
      if(/\.dkds-scientific-nav-tools(?:\s*>?\s*button|\b)/.test(selector)&&/^(?:height|min-height|padding|padding-block|padding-inline)$/i.test(normalized)){
        const genericFallback=selector.startsWith('button:not(:is(');
        const canonical=name==='sdk-semantic-surfaces.css'&&selector==='.dkds-scientific-nav-tools>button'&&/^(?:padding|padding-block|padding-inline)$/i.test(normalized);
        const container=name==='sdk-semantic-surfaces.css'&&selector==='.dkds-scientific-nav-tools'&&/^(?:padding|padding-block|padding-inline)$/i.test(normalized);
        if(!genericFallback&&!canonical&&!container)violations.push(`src/styles/structure/${name}: scientific floating chrome "${selector}" rewrites ${normalized}. Item height is owned by --dkds-scientific-nav-item-* / --dkds-header-action-height slots in sdk-semantic-surfaces.css.`);
      }
      if(/(^|[^-])\.dkds-field-control\b/.test(selector)&&!/:not\(\.dkds-field-control\)/.test(selector)&&fieldDensityGeometry.test(normalized)){
        const canonical=name==='sdk-semantic-surfaces.css'&&selector==='.dkds-field-control';
        if(!canonical)violations.push(`src/styles/structure/${name}: semantic field context "${selector}" rewrites ${normalized}. dkds-field-control density belongs to sdk-semantic-surfaces.css and --dkds-field-control-* slots.`);
      }
      const portableContext=/\.dkds-portable-view\b/.test(selector)&&/(?:\.is-(?:floating|global-floating|docked|sticky)\b|dkds-plugin-canvas-(?:left|right|bottom)|dkds-analysis-(?:right|bottom|workbench))/.test(selector);
      if(portableContext&&portablePlacementGeometry.test(normalized)){
        const canonical=name==='super-top-contract.css'&&['.dkds-portable-view.is-floating','.dkds-portable-view.is-docked','.dkds-portable-view.is-sticky'].includes(selector);
        if(!canonical)violations.push(`src/styles/structure/${name}: PortableView context "${selector}" rewrites ${normalized}. Placement geometry must be resolved by the canonical super-top-contract.css owner through --dkds-portable-* slots.`);
      }

      // R7S: settings/dialog fields are specialized semantic density owners.
      // Generic field baselines and later dialog/settings contexts must never
      // re-own their final content-box properties.
      if(/\.dkds-(?:settings|dialog)-field(?:\s*>?\s*(?:input|select)|\s+(?:input|select))/.test(selector)&&fieldDensityGeometry.test(normalized)){
        const settingsCanonical=name==='workbench-components.css'&&[
          '.dkds-settings-field select',
          '.dkds-settings-field input[type="text"]',
          '.dkds-settings-field input[type="number"]',
          '.dkds-dialog-field>input',
          '.dkds-dialog-field>select'
        ].includes(selector);
        if(!settingsCanonical)violations.push(`src/styles/structure/${name}: specialized field context "${selector}" rewrites ${normalized}. Settings/Dialog field density belongs to workbench-components.css and --dkds-*-field-* slots.`);
      }

      // R7S: Table density changes slot values only. Final cell/header padding
      // and resizer hit geometry stay in the canonical managed-table owner.
      if(/\.dkds-managed-table\[data-dkds-table-density/.test(selector)&&/^(?:font-size|padding|padding-block|padding-inline|padding-left|padding-right|padding-top|padding-bottom)$/i.test(normalized)){
        violations.push(`src/styles/structure/${name}: managed-table density context "${selector}" rewrites ${normalized}. Density variants must set --dkds-table-* slots only.`);
      }
      if(name!=='workbench-components.css'&&/\.dkds-managed-table\b/.test(selector)&&/(?:thead\s+th|tbody\s+(?:td|th))/.test(selector)&&/^(?:padding|padding-block|padding-inline|padding-left|padding-right|padding-top|padding-bottom)$/i.test(normalized)){
        violations.push(`src/styles/structure/${name}: managed-table cell/header "${selector}" rewrites ${normalized}. Final table cell padding belongs to workbench-components.css.`);
      }

      // R7S: Legend density has one base owner. Placement variants may set
      // --dkds-legend-* slots, but must not directly rewrite padding/gap/height.
      if(/\.dkds-scientific-auto-legend\b/.test(selector)&&/^(?:padding|padding-block|padding-inline|gap|row-gap|column-gap|font-size|line-height)$/i.test(normalized)){
        const legendCanonical=name==='workbench-components.css'&&selector==='.dkds-scientific-auto-legend';
        if(!legendCanonical)violations.push(`src/styles/structure/${name}: scientific legend context "${selector}" rewrites ${normalized}. Legend density must flow through --dkds-legend-* slots.`);
      }

      // R7S: collapsed PortableView state feeds header height slots only.
      if(/\.dkds-portable-view\.is-collapsed/.test(selector)&&/(?:\.dkds-portable-header|\.dkds-analysis-prime-head)/.test(selector)&&/^(?:height|min-height|max-height|padding|padding-block|padding-inline|padding-left|padding-right)$/i.test(normalized)){
        violations.push(`src/styles/structure/${name}: collapsed PortableView header "${selector}" rewrites ${normalized}. Collapsed state must set --dkds-portable-header-height / --dkds-analysis-prime-head-min-height on the parent.`);
      }

      // R7S: interaction state may recolor a splitter/resizer but cannot shrink
      // or move its hit target. Geometry is state-invariant during drag/hover.
      if(/(?:resizer|split-handle)/.test(selector)&&/(?:hover|focus-visible|is-dragging|active)/.test(selector)&&/^(?:top|right|bottom|left|width|min-width|max-width|height|min-height|max-height|padding)$/i.test(normalized)){
        const structuralActivation=name==='plugin-workspace.css'&&selector==='.dkds-plugin-canvas-bottom-resizer.active'&&/^(?:height|min-height)$/i.test(normalized);
        if(!structuralActivation)violations.push(`src/styles/structure/${name}: resizer state "${selector}" rewrites ${normalized}. Resize hit geometry must be state-invariant and slot-owned.`);
      }
    }
  }
}


// R7T closes the remaining overlap between generic fallback controls and
// specialized Plugin Manager/Dialog actions, isolates legacy FloatingPanel
// geometry from PortableView, and centralizes interactive transform ownership.
const schemaR7T=fs.readFileSync(path.join(structureDirFinal,'schema-and-plugin-ui.css'),'utf8');
const workbenchR7T=fs.readFileSync(path.join(structureDirFinal,'workbench-components.css'),'utf8');
if(!/button:not\(:is\([\s\S]*\.plugin-manager-page button[\s\S]*\.dkds-settings-dialog button[\s\S]*\.dkds-dialog button[\s\S]*\.dkds-scientific-nav-tools>button[\s\S]*\)\)/.test(schemaR7T))violations.push('R7T generic button fallback must explicitly exclude Plugin Manager, Settings/Dialog and Scientific floating action owners.');
if(!/:not\(\.plugin-manager-page \*\)/.test(schemaR7T))violations.push('R7T generic field fallback must exclude Plugin Manager field density.');
for(const required of ['--dkds-plugin-manager-toolbar-action-height','--dkds-plugin-card-action-height','--dkds-plugin-theme-action-height'])if(!schemaR7T.includes(required))violations.push(`R7T Plugin Manager action geometry is missing ${required}.`);
for(const required of ['--dkds-settings-header-action-size','--dkds-settings-footer-action-height','--dkds-dialog-action-height'])if(!workbenchR7T.includes(required))violations.push(`R7T Settings/Dialog action geometry is missing ${required}.`);
const legacyFloatingGeometry=/^(?:position|inset|left|right|top|bottom|width|min-width|max-width|height|min-height|max-height|overflow|overflow-x|overflow-y|resize|z-index|transform)$/i;
for(const name of structureFiles){
  const css=fs.readFileSync(path.join(structureDirFinal,name),'utf8');
  for(const block of ruleBlocks(css)){
    const selector=block.selector;
    const legacy=/(?:\.floating-panel|\.group-panel|\.inspector-panel)(?=$|[.#:\[\s,>{+~])/.test(selector);
    if(!legacy)continue;
    for(const [prop] of block.decls){
      const normalized=String(prop).trim().toLowerCase();
      if(legacyFloatingGeometry.test(normalized)&&!selector.includes(':not(.dkds-portable-view)'))violations.push(`src/styles/structure/${name}: legacy floating geometry "${selector}" owns ${normalized} without excluding .dkds-portable-view. PortableView must never receive legacy FloatingPanel geometry.`);
    }
  }
}
for(const name of presentationFiles){
  const css=fs.readFileSync(path.join(presentationDir,name),'utf8');
  for(const block of ruleBlocks(css)){
    if(!/(?:hover|active|focus-visible)/.test(block.selector)||!/(?:button|toolbar-btn|activity-tab|dialog-action|plugin-manager)/.test(block.selector))continue;
    for(const [prop] of block.decls)if(String(prop).trim().toLowerCase()==='transform')violations.push(`src/styles/presentation/${name}: interactive control state "${block.selector}" owns transform. Standard control motion belongs to theme/contract.css.`);
  }
}
for(const name of fs.readdirSync(path.join(root,'src','styles','theme')).filter(name=>name.endsWith('.css'))){
  if(name==='contract.css')continue;
  const css=fs.readFileSync(path.join(root,'src','styles','theme',name),'utf8');
  for(const block of ruleBlocks(css)){
    if(!/(?:hover|active|focus-visible)/.test(block.selector)||!/(?:button|toolbarAction|toolbar-btn|activity-tab)/.test(block.selector))continue;
    for(const [prop] of block.decls)if(String(prop).trim().toLowerCase()==='transform')violations.push(`src/styles/theme/${name}: standard control state "${block.selector}" owns transform. Motion recipes belong to theme/contract.css.`);
  }
}

const paintProp=/^(?:background(?:-.+)?|border(?:-.+)?|box-shadow|color|fill|stroke|opacity|outline(?:-.+)?|text-shadow|filter|backdrop-filter|-webkit-backdrop-filter|accent-color)$/i;
const literalColor=/(?:#[0-9a-f]{3,8}\b|rgba?\(|hsla?\()/i;
function declarations(css){
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const out=[];
  for(const m of clean.matchAll(/(?:^|[;{])\s*([\w-]+)\s*:\s*([^;}]*)/gm))out.push([m[1],m[2]]);
  return out;
}
function matchingBrace(text,open){
  let depth=0,quote='',comment=false;
  for(let i=open;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
    if(!quote&&c==='/'&&n==='*'){comment=true;i++;continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return i;
  }
  return -1;
}
function ruleBlocks(css,context=[]){
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const out=[];let cursor=0;
  while(cursor<clean.length){
    const open=clean.indexOf('{',cursor);if(open<0)break;
    const pre=clean.slice(cursor,open).trim();const close=matchingBrace(clean,open);if(close<0)break;
    const body=clean.slice(open+1,close);
    if(pre.startsWith('@')){
      const keyword=(pre.match(/^@([\w-]+)/)||[])[1]||'';
      if(!/keyframes$/i.test(keyword))out.push(...ruleBlocks(body,[...context,pre.replace(/\s+/g,' ')]));
    }else if(pre){
      const decls=declarations(`{${body}}`);
      if(decls.length)for(const raw of splitSelectorList(pre)){
        const selector=raw.replace(/\s+/g,' ').trim();
        if(selector&&selector!=='from'&&selector!=='to'&&!/^\d+(?:\.\d+)?%$/.test(selector))out.push({selector,context:context.join(' > '),decls});
      }
    }
    cursor=close+1;
  }
  return out;
}
// R7S paint ownership: Theme Providers own values, but final standard-component
// paint selectors stay in Component Appearance / Material Renderer. Feature UI
// styles may paint their own theme settings/gallery DOM, but may not become a
// second Core Component Runtime paint owner.
const themeDir=path.join(root,'src','styles','theme');
const themeFiles=fs.readdirSync(themeDir).filter(name=>name.endsWith('.css')).sort();
for(const name of themeFiles){
  if(['component-appearance.css','material-renderer.css'].includes(name))continue;
  const css=fs.readFileSync(path.join(themeDir,name),'utf8');
  for(const block of ruleBlocks(css)){
    if(!block.selector.includes('[data-dkds-component-identity='))continue;
    for(const [prop] of block.decls){
      if(paintProp.test(String(prop).trim()))violations.push(`src/styles/theme/${name}: Core component paint selector "${block.selector}" owns ${prop}. Standard component paint belongs to component-appearance.css / material-renderer.css.`);
    }
  }
}

function assertNoSameSelectorPropertyOverride(dir,files,label){
  for(const name of files){
    const css=fs.readFileSync(path.join(dir,name),'utf8');
    const seen=new Map();
    for(const block of ruleBlocks(css)){
      const key=`${block.context}\u0000${block.selector}`;
      if(!seen.has(key))seen.set(key,new Set());
      const props=seen.get(key);
      for(const [prop] of block.decls){
        const normalized=String(prop).trim().toLowerCase();
        if(props.has(normalized))violations.push(`${label}/${name}: selector "${block.selector}" rewrites property ${normalized} later in the same cascade context${block.context?` (${block.context})`:''}. Merge ownership instead of patching it later.`);
        props.add(normalized);
      }
    }
  }
}
for(const name of structureFiles){
  const css=fs.readFileSync(path.join(structureDirFinal,name),'utf8');
  for(const [prop,value] of declarations(css)){
    if(paintProp.test(prop))violations.push(`src/styles/structure/${name}: paint property ${prop} belongs to presentation/theme.`);
    if(literalColor.test(value))violations.push(`src/styles/structure/${name}: literal color belongs to presentation/theme (${prop}:${value.trim()}).`);
  }
}
const foundationClean=foundationCss.replace(/\/\*[\s\S]*?\*\//g,'');
for(const selector of ownedSelectors(foundationClean))if(!['*','html','body','#app','button','input','select'].includes(selector))violations.push(`src/styles/foundation/foundation.css: component selector ${selector} is forbidden; Foundation is reset-only.`);
for(const [prop,value] of declarations(foundationClean)){
  if(paintProp.test(prop))violations.push(`src/styles/foundation/foundation.css: paint property ${prop} is forbidden; Foundation is reset-only.`);
  if(literalColor.test(value))violations.push(`src/styles/foundation/foundation.css: literal color is forbidden; Foundation is reset-only.`);
}
const legacyTokenAlias=/--(?:bg|panel|border|text|muted|accent|shadow|line)(?![-\w])/g;
for(const file of authored){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const css=fs.readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  if(legacyTokenAlias.test(css))violations.push(`${rel}: legacy short theme token alias must not return; use canonical semantic tokens.`);
  legacyTokenAlias.lastIndex=0;
}
// Semantic presentation owners that must remain explicit.
const presentationText=Object.fromEntries(presentationFiles.map(name=>[name,fs.readFileSync(path.join(presentationDir,name),'utf8')]));
for(const [name,css] of Object.entries(presentationText)){
  if(name==='control-status.css')continue;
  for(const selector of ['dkds-analysis-nav-btn','plugin-status-item'])if(css.includes(`.${selector}`))violations.push(`src/styles/presentation/${name}: .${selector} state belongs to control-status.css.`);
  if(css.includes('#statusBar.statusbar'))violations.push(`src/styles/presentation/${name}: #statusBar.statusbar chrome belongs to control-status.css.`);
}
for(const name of presentationFiles.filter(name=>name!=='shell.css')){
  const selectors=new Set(ownedSelectors(presentationText[name]));
  for(const target of ['body.dkds-modern-ui .floating-panel','body.dkds-modern-ui .floating-header','html[data-dkds-theme="dark"] body.dkds-modern-ui .floating-panel','html[data-dkds-theme="dark"] body.dkds-modern-ui .floating-header'])if(selectors.has(target))violations.push(`src/styles/presentation/${name}: ${target} belongs to shell.css.`);
}
// Scientific cards/headers are semantic Material/Component surfaces. Presentation may
// keep chart-domain marks and geometry, but it must not be the final surface-paint owner.
// A legend inside a Trend Card is content, not another Material surface: registering both
// produces a nested glass/card layer and recreates the card-within-card visual defect.
const scientificMaterialSelectors=['.trend-card','.analysis-chart-card','.dkds-group-plot-card'];
const semanticRegistryText=fs.readFileSync(path.join(root,'src','core','theme','semantic-registry.js'),'utf8');
for(const target of scientificMaterialSelectors)if(!semanticRegistryText.includes(target))violations.push(`semantic material ownership: ${target} must be registered in semantic-registry.js.`);
if(semanticRegistryText.includes('.trend-card-legend'))violations.push('semantic material ownership: .trend-card-legend must remain child content, not a nested Material surface.');
// First-party plugins own domain layout/content. Core owns application paint and
// standard control/header geometry. The same audit is shipped in the public SDK.
if(fs.existsSync(plugins))for(const e of fs.readdirSync(plugins,{withFileTypes:true})){
  if(!e.isDirectory())continue;const folder=path.join(plugins,e.name),p=path.join(folder,'plugin.css');if(!fs.existsSync(p))continue;
  const cssRaw=fs.readFileSync(p,'utf8');
  const css=cssRaw.replace(/\/\*[\s\S]*?\*\//g,'');
  if(literalColor.test(css))violations.push(`src/plugins/${e.name}/plugin.css: literal application color is forbidden; use Core semantic/theme surfaces.`);
  const sourceFiles=[];const walk=d=>{for(const row of fs.readdirSync(d,{withFileTypes:true})){const sourcePath=path.join(d,row.name);if(row.isDirectory())walk(sourcePath);else if(row.isFile()&&/\.(?:js|html)$/.test(row.name))sourceFiles.push(sourcePath);}};walk(folder);
  const aliases=collectCoreAliases(sourceFiles.map(sourcePath=>fs.readFileSync(sourcePath,'utf8')).join('\n'));
  const audit=inspectPluginCss(cssRaw,{path:`src/plugins/${e.name}/plugin.css`,aliases});
  for(const issue of audit.issues)violations.push(`${issue.code}: ${issue.message}`);
}
if(violations.length){console.error(violations.join('\n'));process.exit(1);}
console.log(`Style architecture OK: ${authored.length} authored CSS files, 0 !important, layered ownership active.`);
