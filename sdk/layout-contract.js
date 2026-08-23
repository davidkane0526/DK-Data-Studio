'use strict';

function numericApi(api){
  const m=String(api||'').match(/^1\.(\d+)(?:\.(\d+))?$/);return m?{minor:Number(m[1])||0,patch:Number(m[2])||0}:null;
}
function isStrict(api){const v=numericApi(api);return !!v&&v.minor>=16;}
function cssRules(css=''){
  const text=String(css||'').replace(/\/\*[\s\S]*?\*\//g,'');const rows=[];const re=/([^{}]+)\{([^{}]*)\}/g;let m;
  while((m=re.exec(text))){const selector=String(m[1]||'').trim(),body=String(m[2]||'').trim();if(selector&&body)rows.push({selector,body});}
  return rows;
}
function inspectWorkspaceStyles({apiVersion,pluginType,workspace,ui={},styles=[]}={}){
  if(!isStrict(apiVersion))return {errors:[],warnings:[]};
  const top=String(workspace?.role||'').toLowerCase()==='top';
  const layoutRelevant=top||['workbench','tool','task','extension','developer'].includes(String(pluginType||''));
  const errors=[],warnings=[];
  const tableOverrides=new Set(Array.isArray(ui?.tableAppearance?.cssOverrides)?ui.tableAppearance.cssOverrides.map(String):[]);
  const riskyName=/(?:^|[-_.#])(root|main|content|card|panel|workbench|page|body|section|grid|results?|controls?|shell|layout|view|designer|form|editor)(?:$|[-_.:#\s>+~])/i;
  const visualName=/(plot|chart|canvas|svg|image|viewport)/i;
  const criticalFlexibleName=/(plot|chart|canvas|viewport|scientific|graph|waveform|workbench|workspace|shell|main|content|layout|view|results?)/i;
  const hostSelector=/(^|[\s,>+~])(html|body|#app)(?=$|[\s,>+~.#:[\]])|\.dkds-(?:plugin-workspace|analysis-|plugin-canvas-|scientific-)|#statusBar\b|\.plugin-window-status\b/i;
  const globalControl=/(^|,)\s*(button|input|select|textarea|table|a)\s*(?=,|$)/i;
  const targetFragments=selector=>String(selector||'').split(',').map(part=>part.trim().split(/\s+|>|\+|~/).filter(Boolean).at(-1)||'');
  for(const style of styles){
    const name=String(style?.name||'plugin.css'),css=String(style?.content||'');
    for(const rule of cssRules(css)){
      const {selector,body}=rule;
      if(hostSelector.test(selector))errors.push(`${name}: selector "${selector}" targets Core-owned shell/workspace DOM. Style only plugin-owned elements and use design tokens.`);
      if(globalControl.test(selector))errors.push(`${name}: global control selector "${selector}" is not allowed. Scope controls under a plugin-owned class.`);
      const tableInternal=/(?:\.dkds-managed-table|\.dkds-table-|\[data-dkds-core-surface=["']?table|(?:^|[\s>+~,])(table|thead|tbody|tr|th|td)(?=$|[\s>+~.#:[\],]))/i.test(selector);
      if(tableInternal){
        const striping=/tbody[^,{]*tr\s*:(?:nth-child|nth-of-type)\s*\(/i.test(selector);
        const rowState=/tbody[^,{]*tr(?:(?:\.|\[)[^,{]*|\s*:(?:hover|focus|active))/i.test(selector);
        const allowed=(striping&&tableOverrides.has('row-striping'))||(rowState&&tableOverrides.has('row-state'));
        if(!allowed)errors.push(`${name}: selector "${selector}" styles Core TableSurface internals. Use ctx.ui.tables appearance options. Only narrowly declared ui.tableAppearance.cssOverrides (row-striping / row-state) may target table rows.`);
        else warnings.push(`${name}: declared table CSS override "${selector}" is allowed, but Core TableSurface appearance options are preferred for theme-safe tables.`);
      }
      const targets=targetFragments(selector),semanticTarget=targets.some(target=>riskyName.test(target)&&!visualName.test(target));
      const overflowHidden=/(?:^|;)\s*overflow(?:-[xy])?\s*:\s*(hidden|clip)\b/i.test(body);
      if(layoutRelevant&&overflowHidden&&semanticTarget)errors.push(`${name}: "${selector}" clips semantic UI with overflow:hidden/clip. Plugin API 1.16 requires visible overflow or scrolling; Core provides the final safety net.`);
      const explicitVisible=/(?:^|;)\s*overflow(?:-[xy])?\s*:\s*visible\b/i.test(body);
      const largeMinimum=/(?:^|;)\s*min-height\s*:\s*(?:[2-9]\d{2}|1\d{3,})px\b/i.test(body);
      if(layoutRelevant&&semanticTarget&&explicitVisible&&largeMinimum)warnings.push(`${name}: "${selector}" combines overflow:visible with a large minimum height. Core will contain real overflow at runtime, but prefer flexible minmax(0,1fr)/auto rows so containment recovery is unnecessary.`);
      const percentageMinHeight=/(?:^|;)\s*min-height\s*:\s*100%(?=\s*;|\s*$)/i.test(body);
      if(layoutRelevant&&semanticTarget&&percentageMinHeight)warnings.push(`${name}: "${selector}" chains min-height:100% into a semantic workspace region. In Core safe mode the Primary viewport already owns the height floor; prefer min-height:0 so content cannot feed its intrinsic height back into the Host.`);
      const gridRows=body.match(/(?:^|;)\s*grid-template-rows\s*:\s*([^;]+)/i)?.[1]||'';
      const autoRows=(gridRows.match(/(?:^|\s)auto(?=\s|$)/gi)||[]).length;
      const compactAutoGrid=/(?:^|;)\s*display\s*:\s*(?:inline-)?grid\b/i.test(body)&&autoRows>=2&&!/(?:^|;)\s*align-content\s*:\s*(?:start|flex-start)\b/i.test(body);
      if(layoutRelevant&&semanticTarget&&compactAutoGrid)warnings.push(`${name}: "${selector}" uses ${autoRows} auto Grid rows without align-content:start. If a sibling makes this card taller, CSS Grid can distribute spare height between the auto rows and create large blank gaps; declare align-content:start for compact form/card layouts.`);
      const positiveFlexibleRow=/(?:^|;)\s*grid-template-rows\s*:[^;]*minmax\(\s*[1-9]\d*(?:\.\d+)?px\s*,\s*1fr\s*\)/i.test(body);
      if(positiveFlexibleRow){
        const criticalTarget=targets.some(target=>criticalFlexibleName.test(target));
        const message=`${name}: "${selector}" uses a positive-pixel minmax(...,1fr) row. Use minmax(0,1fr) or auto for responsive scientific/workspace regions.`;
        if(layoutRelevant&&criticalTarget)errors.push(message);else warnings.push(message);
      }
      if(layoutRelevant&&/(?:^|;)\s*height\s*:\s*(?:100d?vh|calc\([^;]*100d?vh)/i.test(body))errors.push(`${name}: "${selector}" owns viewport height. Dedicated window viewport/status-bar geometry is Core-owned.`);
      if(layoutRelevant&&/position\s*:\s*fixed\b/i.test(body)&&semanticTarget)errors.push(`${name}: "${selector}" fixes a workspace/content container to the viewport. Use PluginWorkspace slots instead.`);
      if(layoutRelevant&&/(?:^|;)\s*height\s*:\s*[1-9]\d{2,}px\b/i.test(body)&&semanticTarget)warnings.push(`${name}: "${selector}" has a large fixed height; prefer min-height + flexible layout.`);
    }
  }
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
module.exports={inspectWorkspaceStyles,isStrict};
