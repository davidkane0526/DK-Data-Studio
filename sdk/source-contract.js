'use strict';

// Static Plugin API source audit shared by the standalone SDK tooling and the
// application package installer. The runtime facade is intentionally singular:
// manifest/capability vocabulary may say "plugin workspace", but executable
// plugin code uses ctx.ui.workspaceSurface.
const PUBLIC_UI_FACADES=Object.freeze({
  dom:'ui.dom',
  components:'ui.components',
  scientificPlot:'ui.scientific-plot',
  series:'ui.series',
  legends:'ui.legend-groups',
  groupPlots:'ui.group-plots',
  tooltips:'ui.tooltips',
  plotViews:'ui.plot-views',
  tables:'ui.table',
  settings:'ui.settings',
  dialogs:'ui.dialogs',
  selection:'ui.selection',
  interaction:'ui.interaction',
  interactions:'ui.interaction',
  interactionBehaviors:'ui.interaction-behavior',
  contextMenus:'ui.context-menus',
  workspaceSurface:'ui.workspace',
  grid:'ui.workspace',
  portable:'ui.portable',
  layout:'ui.workspace',
  actions:'ui.actions',
  activities:'ui.activities',
  topWorkspace:'ui.top-workspace',
  prime:null,
  sub:null,
  toolbar:'ui.toolbar',
  statusBar:'ui.status-bar',
  mainTools:null,
  menus:'ui.menus',
  sidebar:null,
  inspectors:null,
  groupCharts:null,
  groupViews:null,
  mainViews:null,
  selectionMenus:null,
  mainOverlays:null,
  shortcuts:'ui.shortcuts',
  pages:'ui.pages',
  panels:null,
  styles:'ui.styles',
  theme:'ui.theme',
  edit:'ui.edit',
  designSystem:'ui.design-system'
});

const UI_FACADE_SUGGESTIONS=Object.freeze({
  pluginWorkspace:'workspaceSurface',
  workspace:'workspaceSurface',
  table:'tables',
  scientificPlots:'scientificPlot'
});

function codeOnly(source){
  const input=String(source||'');
  const out=Array(input.length).fill(' ');
  let i=0,mode='code',quote='',templateExpressionDepth=[],regexClass=false;
  let lastSignificant='';
  while(i<input.length){
    const c=input[i],n=input[i+1];
    if(mode==='line-comment'){
      if(c==='\n'){out[i]='\n';mode='code';}
      i++;continue;
    }
    if(mode==='block-comment'){
      if(c==='*'&&n==='/'){i+=2;mode='code';continue;}
      if(c==='\n')out[i]='\n';i++;continue;
    }
    if(mode==='string'){
      if(c==='\\'){i+=Math.min(2,input.length-i);continue;}
      if(c===quote){mode='code';quote='';i++;continue;}
      if(c==='\n')out[i]='\n';i++;continue;
    }
    if(mode==='template'){
      if(c==='\\'){i+=Math.min(2,input.length-i);continue;}
      if(c==='`'){mode='code';i++;continue;}
      if(c==='$'&&n==='{'){
        templateExpressionDepth.push(1);out[i]='$';out[i+1]='{';i+=2;mode='code';continue;
      }
      if(c==='\n')out[i]='\n';i++;continue;
    }
    if(mode==='regex'){
      if(c==='\\'){i+=Math.min(2,input.length-i);continue;}
      if(c==='['){regexClass=true;i++;continue;}
      if(c===']'&&regexClass){regexClass=false;i++;continue;}
      if(c==='/'&&!regexClass){mode='code';lastSignificant='/';i++;continue;}
      if(c==='\n'){out[i]='\n';mode='code';regexClass=false;}
      i++;continue;
    }

    // code
    if(c==='/'&&n==='/'){mode='line-comment';i+=2;continue;}
    if(c==='/'&&n==='*'){mode='block-comment';i+=2;continue;}
    if(c==='/'){
      const regexPrefix=!lastSignificant||/[({[=,:;!?&|+*%^~<>-]/.test(lastSignificant);
      if(regexPrefix){mode='regex';regexClass=false;i++;continue;}
    }
    if(c==='\''||c==='"'){mode='string';quote=c;i++;continue;}
    if(c==='`'){mode='template';i++;continue;}
    if(templateExpressionDepth.length){
      if(c==='{')templateExpressionDepth[templateExpressionDepth.length-1]++;
      else if(c==='}'){
        templateExpressionDepth[templateExpressionDepth.length-1]--;
        if(templateExpressionDepth[templateExpressionDepth.length-1]===0){
          templateExpressionDepth.pop();out[i]=c;i++;mode='template';continue;
        }
      }
    }
    out[i]=c;if(!/\s/.test(c))lastSignificant=c;i++;
  }
  return out.join('');
}

function uiFacadeUsages(source){
  const code=codeOnly(source),rows=[];
  const seen=new Set();
  const record=(name,index,syntax)=>{
    name=String(name||'').trim();if(!name)return;
    const key=`${name}@${index}`;if(seen.has(key))return;seen.add(key);
    rows.push({name,index,syntax});
  };
  const dot=/\bctx\s*\.\s*ui\s*(?:\?\s*\.\s*|\.\s*)([A-Za-z_$][\w$]*)/g;
  let match;while((match=dot.exec(code)))record(match[1],match.index,'dot');
  // String contents are intentionally masked in `code`, so use the executable
  // bracket start from `code` and read only that key from the original source.
  const bracketStart=/\bctx\s*\.\s*ui\s*\[/g;
  while((match=bracketStart.exec(code))){
    const open=match.index+match[0].lastIndexOf('['),tail=String(source||'').slice(open+1,open+100);
    const key=tail.match(/^\s*(['"])([A-Za-z_$][\w$]*)\1\s*\]/);
    if(key)record(key[2],match.index,'bracket');
  }
  const destructure=/\{([^{}]{1,300})\}\s*=\s*ctx\s*\.\s*ui\b/g;
  while((match=destructure.exec(code))){
    for(const part of String(match[1]||'').split(',')){
      const item=part.trim(),name=item.match(/^([A-Za-z_$][\w$]*)(?:\s*:|\s*=|$)/)?.[1];
      if(name)record(name,match.index+match[0].indexOf(name),'destructure');
    }
  }
  return rows.sort((a,b)=>a.index-b.index);
}

function lineColumn(source,index){
  const text=String(source||'').slice(0,Math.max(0,index));
  const lines=text.split('\n');return {line:lines.length,column:(lines[lines.length-1]||'').length+1};
}


function escapeRegex(value){return String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

function usesThemeRegister(source){
  const code=codeOnly(source);
  const direct=/\bctx\s*\.\s*ui\s*\.\s*theme\s*(?:\?\s*\.)?\s*\.\s*register\s*\(/;
  if(direct.test(code))return true;
  const alias=/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*ctx\s*\.\s*ui\s*\.\s*theme\b/g;
  let match;
  while((match=alias.exec(code))){
    const name=escapeRegex(match[1]);
    if(new RegExp(`\\b${name}\\s*(?:\\?\\s*\\.)?\\s*\\.\\s*register\\s*\\(`).test(code.slice(match.index)))return true;
  }
  const destructure=/\b(?:const|let|var)\s*\{([^{}]{1,240})\}\s*=\s*ctx\s*\.\s*ui\s*\.\s*theme\b/g;
  while((match=destructure.exec(code))){
    for(const part of String(match[1]||'').split(',')){
      const row=part.trim().match(/^register(?:\s*:\s*([A-Za-z_$][\w$]*))?(?:\s*=.*)?$/);
      if(!row)continue;
      const local=escapeRegex(row[1]||'register');
      if(new RegExp(`\\b${local}\\s*\\(`).test(code.slice(match.index+match[0].length)))return true;
    }
  }
  return false;
}

function inspectPluginSource(source,{apiVersion='1.19.0',requiresCore=[]}={}){
  const declared=new Set(Array.isArray(requiresCore)?requiresCore.map(String):[]),issues=[],usages=uiFacadeUsages(source);
  for(const usage of usages){
    const requirement=Object.prototype.hasOwnProperty.call(PUBLIC_UI_FACADES,usage.name)?PUBLIC_UI_FACADES[usage.name]:undefined;
    const location=lineColumn(source,usage.index);
    if(requirement===undefined){
      const suggestion=UI_FACADE_SUGGESTIONS[usage.name]||'';
      const replacement=suggestion?` Use ctx.ui.${suggestion}${suggestion==='workspaceSurface'?' (requiresCore: ui.workspace; capability label: ui.plugin-workspace)':''}.`:'';
      issues.push({
        code:'UNSUPPORTED_UI_FACADE',severity:'error',path:`ctx.ui.${usage.name}`,name:usage.name,suggestion,line:location.line,column:location.column,
        message:`ctx.ui.${usage.name} is not a public Plugin API ${apiVersion} runtime facade.${replacement}`
      });
      continue;
    }
    if(requirement&&!declared.has(requirement)){
      issues.push({
        code:'MISSING_CORE_REQUIREMENT',severity:'error',path:`ctx.ui.${usage.name}`,name:usage.name,requirement,line:location.line,column:location.column,
        message:`ctx.ui.${usage.name} requires ${requirement} in plugin.json requiresCore.`
      });
    }
  }
  return {ok:issues.length===0,apiVersion:String(apiVersion||''),issues,usages};
}

module.exports={PUBLIC_UI_FACADES,UI_FACADE_SUGGESTIONS,codeOnly,uiFacadeUsages,usesThemeRegister,inspectPluginSource};
