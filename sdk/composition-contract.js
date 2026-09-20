'use strict';

function lineAt(source,index){return String(source||'').slice(0,Math.max(0,index)).split('\n').length;}
function valuesInArray(text,key){const m=String(text||'').match(new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`));if(!m)return [];return [...m[1].matchAll(/["']([^"']+)["']/g)].map(row=>row[1]);}
function objectEnd(text,left){
  let depth=0,quote='',escaped=false;
  for(let i=left;i<text.length;i+=1){const ch=text[i];if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}if(ch==='{')depth+=1;else if(ch==='}'){depth-=1;if(depth===0)return i+1;}}
  return Math.min(text.length,left+2400);
}
function objectWindows(source,needle){
  const rows=[];let start=0;const text=String(source||'');
  while((start=text.indexOf(needle,start))>=0){const left=Math.max(0,text.lastIndexOf('{',start));const right=objectEnd(text,left);rows.push({index:start,text:text.slice(left,right)});start+=needle.length;}
  return rows;
}
function callObjectWindows(source,needle){
  const rows=[];let start=0;const text=String(source||'');
  while((start=text.indexOf(needle,start))>=0){const left=text.indexOf('{',start+needle.length);if(left<0){start+=needle.length;continue;}const right=objectEnd(text,left);rows.push({index:start,text:text.slice(left,right)});start=right;}
  return rows;
}
function issue(code,message,index,source,severity='error'){return Object.freeze({code,message,line:lineAt(source,index),severity});}
function hasTrue(text,key){return new RegExp(`${key}\\s*:\\s*true\\b`).test(text);}
function hasFalse(text,key){return new RegExp(`${key}\\s*:\\s*false\\b`).test(text);}
function propString(text,key){return String(text||'').match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`))?.[1]||'';}
function hasColumnsControl(text){return /controls\s*:\s*\[[\s\S]*?kind\s*:\s*["']columns["']/.test(text)||/id\s*:\s*["']group-columns["']/.test(text);}

function inspectCompositionSource(source){
  const text=String(source||'');const issues=[];
  const roleRows=objectWindows(text,'presentationRole');
  for(const row of roleRows){
    const role=propString(row.text,'presentationRole');if(!role)continue;
    const placements=valuesInArray(row.text,'placements'),movable=placements.length>=2,fixedByShape=placements.length===1,fixedDeclared=hasTrue(row.text,'fixed');
    const placementControl=propString(row.text,'placementControl')||(role==='data-control'?'host':'surface');
    const existing=/\b(?:existingNode|node)\s*:/.test(row.text),auto=/chrome\s*:\s*["']auto["']/.test(row.text),noChrome=hasFalse(row.text,'chrome');
    const handle=/\bhandle\s*:/.test(row.text),controls=/\bcontrolsHost\s*:/.test(row.text),explicitChrome=handle&&controls;
    const handleValue=propString(row.text,'handle');
    if(fixedDeclared&&movable)issues.push(issue('FIXED_PRIME_WITH_MULTIPLE_PLACEMENTS','fixed PRIME must declare exactly one placement.',row.index,text));
    if(movable&&placementControl==='surface'&&/showPlacement\s*:\s*false\b/.test(row.text))issues.push(issue('MOVABLE_PRIME_WITHOUT_PLACEMENT_CONTROL','surface-controlled movable PRIME must expose the canonical placement control.',row.index,text));
    if((fixedByShape||fixedDeclared)&&placementControl==='surface'&&/showPlacement\s*:\s*true\b/.test(row.text))issues.push(issue('FIXED_PRIME_EXPOSES_POSITION_CHOOSER','fixed PRIME must not expose a placement chooser.',row.index,text));
    if(existing&&movable&&placementControl==='surface'){
      if(noChrome||(!auto&&!explicitChrome))issues.push(issue('MOVABLE_PRIME_WITHOUT_CANONICAL_CHROME','surface-controlled movable existingNode PRIME must declare handle + controlsHost or chrome:"auto".',row.index,text));
      if(/(?:\.dkds-surface-header|\.analysis-chart-title)/.test(handleValue))issues.push(issue('MOVABLE_PRIME_AMBIGUOUS_SECTION_HEADER','surface-controlled movable PRIME handle must not reuse a generic section/chart title selector as whole-window chrome.',row.index,text));
    }
    if(role==='inspector'&&(placementControl!=='surface'||noChrome||(existing&&movable&&!auto&&!explicitChrome)))issues.push(issue('INSPECTOR_WITHOUT_CANONICAL_HEADER','inspector PRIME requires surface-controlled canonical Core chrome/header.',row.index,text));
    if(noChrome&&/\bheader\s*:\s*\{[\s\S]*?mode\s*:\s*["']generated["']/.test(row.text))issues.push(issue('PRIME_VISUAL_HEADER_WITHOUT_CANONICAL_CHROME','PRIME cannot request generated canonical header while chrome:false.',row.index,text));
    if(role==='scientific-secondary'&&hasTrue(row.text,'embedded'))issues.push(issue('SCIENTIFIC_SECONDARY_EMBEDDED_IN_PRIMARY_WITH_DUPLICATE_ROLE','scientific-secondary PRIME must not be embedded into PRIMARY as a duplicate semantic surface.',row.index,text));
    if(role==='scientific-secondary'&&/(?:plotGroups\.create|kind\s*:\s*["']plot-group["'])/.test(row.text)&&!hasColumnsControl(row.text))issues.push(issue('GROUP_PRIME_MISSING_LAYOUT_CONTROL','PlotGroup scientific-secondary PRIME should expose the canonical columns layout control.',row.index,text));
  }
  for(const row of objectWindows(text,'existingNode')){
    const placements=valuesInArray(row.text,'placements');if(placements.length<2)continue;
    const role=propString(row.text,'presentationRole');const placementControl=propString(row.text,'placementControl')||(role==='data-control'?'host':'surface');if(placementControl!=='surface')continue;
    const auto=/chrome\s*:\s*["']auto["']/.test(row.text),noChrome=hasFalse(row.text,'chrome'),handle=/\bhandle\s*:/.test(row.text),controls=/\bcontrolsHost\s*:/.test(row.text);
    if(noChrome||(!auto&&!(handle&&controls))){const line=lineAt(text,row.index);if(!issues.some(x=>x.code==='MOVABLE_PRIME_WITHOUT_CANONICAL_CHROME'&&x.line===line))issues.push(issue('MOVABLE_PRIME_WITHOUT_CANONICAL_CHROME','surface-controlled movable existingNode PRIME must declare handle + controlsHost or chrome:"auto".',row.index,text));}
  }
  for(const row of callObjectWindows(text,'registerPrime(')){
    if(!/\bpresentationRole\s*:/.test(row.text))issues.push(issue('PRIME_WITHOUT_PRESENTATION_ROLE','registerPrime(...) must declare presentationRole so Presenter projection is deterministic.',row.index,text));
  }
  for(const match of text.matchAll(/(?:ctx\.ui\.groupArea|\bworkbench\.groupArea|\bwb\.groupArea)\s*\(/g)){const nearby=text.slice(match.index,Math.min(text.length,match.index+2200));if(!/plotViews\.(?:bind|create)\s*\(|plotGroups\.create\s*\(/.test(nearby))issues.push(issue('GROUP_AREA_SCIENTIFIC_CHILD_NOT_PLOTVIEW','scientific GroupArea children must be canonical PlotViews; prefer ctx.ui.plotGroups.create(...).',match.index,text));}
  for(const match of text.matchAll(/ctx\.ui\.plotViews\.bind\s*\(/g)){const nearby=text.slice(match.index,Math.min(text.length,match.index+1800));if(!/surface\s*:\s*["']scientific-card["']/.test(nearby))issues.push(issue('PLOTVIEW_NON_CANONICAL_CARD_SURFACE','direct scientific PlotView.bind(...) must opt into the canonical scientific-card surface.',match.index,text));}
  for(const row of callObjectWindows(text,'pluginWorkspace.create(').concat(callObjectWindows(text,'analysisWorkbench.create('))){if(/\bactivity\s*:/.test(row.text)&&/titlePolicy\s*:\s*["']both["']/.test(row.text))issues.push(issue('TOP_DUPLICATE_ACTIVITY_TITLE','TOP/SUPER workbench with Host activity chrome should not request duplicate page+host titles.',row.index,text,'warning'));}
  const directPortable=[...text.matchAll(/ctx\.ui\.portable\.create\s*\(/g)];if(directPortable.length&&!/(?:pluginWorkspace|analysisWorkbench|workspaceSurface|workbench)\b/.test(text))for(const match of directPortable)issues.push(issue('ORPHAN_FLOATING_CONTROL','direct PortableView without a workspace owner can create an orphan floating control.',match.index,text,'warning'));
  return Object.freeze({issues:Object.freeze(issues)});
}

function inspectCompositionCss(css,{path='plugin.css'}={}){
  const text=String(css||'');const issues=[];
  const blocks=[...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for(const match of blocks){const selector=String(match[1]||'').trim(),body=String(match[2]||'');const index=match.index||0;
    const ownsGroup=/(?:dkds-plot-group|dkds-group-area-grid)/.test(selector),ownsCard=/dkds-scientific-card/.test(selector),ownsPlotView=/(?:dkds-plot-view|data-dkds-plot-view)/.test(selector),ownsPlotHeader=/(?:dkds-plot-view-head|data-dkds-plot-header)/.test(selector);
    if(ownsGroup&&/(?:^|[;\s])(?:gap|row-gap|column-gap)\s*:/.test(body))issues.push(issue('PLOT_GROUP_NONCANONICAL_GAP',`${path}: PlotGroup spacing is Core-owned; declare density instead of raw gap.`,index,text));
    if(ownsGroup&&/(?:^|[;\s])height\s*:\s*(?!auto\b|var\()/i.test(body))issues.push(issue('FIXED_HEIGHT_INSIDE_RESPONSIVE_PLOTGROUP',`${path}: responsive PlotGroup children must not use plugin-owned fixed height.`,index,text));
    if(ownsCard&&/(?:border-radius|background(?:-color)?|border(?:-color)?|box-shadow)\s*:/.test(body))issues.push(issue('PLUGIN_OWNS_CANONICAL_SURFACE_PAINT',`${path}: ScientificCard paint/radius is Core/Theme-owned.`,index,text));
    if((ownsCard||ownsPlotView)&&/border-radius\s*:/.test(body))issues.push(issue('PLUGIN_OWNS_PLOTVIEW_BORDER_RADIUS',`${path}: PlotView/ScientificCard final radius is Core-owned.`,index,text));
    if(ownsPlotHeader&&/(?:border(?:-bottom)?(?:-color)?|background(?:-color)?|box-shadow)\s*:/.test(body))issues.push(issue('PLUGIN_OWNS_PLOTVIEW_HEADER_SEAM',`${path}: PlotView header/body seam paint is Core-owned.`,index,text));
    if(/dkds-scientific-section/.test(selector)&&/(?:margin-top|top|transform)\s*:\s*-(?:\d|\.)/.test(body))issues.push(issue('NEGATIVE_SECTION_FLOW_OFFSET',`${path}: ScientificSection must remain in normal document flow; negative flow offsets are not allowed.`,index,text));
  }
  return Object.freeze({issues:Object.freeze(issues)});
}

module.exports=Object.freeze({inspectCompositionSource,inspectCompositionCss});
