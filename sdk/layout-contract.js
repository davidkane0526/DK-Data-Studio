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
function inspectWorkspaceStyles({apiVersion,pluginType,workspace,styles=[]}={}){
  if(!isStrict(apiVersion))return {errors:[],warnings:[]};
  const top=String(workspace?.role||'').toLowerCase()==='top';
  if(!top&&!['workbench','tool'].includes(String(pluginType||'')))return {errors:[],warnings:[]};
  const errors=[],warnings=[];
  const riskyName=/(?:^|[-_.#])(root|main|content|card|panel|workbench|page|body|section|grid|results?|controls?|shell|layout|view)(?:$|[-_.:#\s>+~])/i;
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
      const targets=targetFragments(selector),semanticTarget=targets.some(target=>riskyName.test(target)&&!visualName.test(target));
      const overflowHidden=/(?:^|;)\s*overflow(?:-[xy])?\s*:\s*(hidden|clip)\b/i.test(body);
      if(overflowHidden&&semanticTarget)errors.push(`${name}: "${selector}" clips semantic UI with overflow:hidden/clip. Plugin API 1.16 requires visible overflow or scrolling; Core provides the final safety net.`);
      const positiveFlexibleRow=/(?:^|;)\s*grid-template-rows\s*:[^;]*minmax\(\s*[1-9]\d*(?:\.\d+)?px\s*,\s*1fr\s*\)/i.test(body);
      if(positiveFlexibleRow){
        const criticalTarget=targets.some(target=>criticalFlexibleName.test(target));
        const message=`${name}: "${selector}" uses a positive-pixel minmax(...,1fr) row. Use minmax(0,1fr) or auto for responsive scientific/workspace regions.`;
        if(criticalTarget)errors.push(message);else warnings.push(message);
      }
      if(/(?:^|;)\s*height\s*:\s*(?:100d?vh|calc\([^;]*100d?vh)/i.test(body))errors.push(`${name}: "${selector}" owns viewport height. Dedicated window viewport/status-bar geometry is Core-owned.`);
      if(/position\s*:\s*fixed\b/i.test(body)&&semanticTarget)errors.push(`${name}: "${selector}" fixes a workspace/content container to the viewport. Use PluginWorkspace slots instead.`);
      if(/(?:^|;)\s*height\s*:\s*[1-9]\d{2,}px\b/i.test(body)&&semanticTarget)warnings.push(`${name}: "${selector}" has a large fixed height; prefer min-height + flexible layout.`);
    }
  }
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
module.exports={inspectWorkspaceStyles,isStrict};
