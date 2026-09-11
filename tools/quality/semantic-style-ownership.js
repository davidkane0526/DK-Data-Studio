#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const {collectCssFiles,ruleBlocks,splitSelectorList,canonicalSelector}=require('./style-ownership');
const ROOT=path.resolve(__dirname,'../..');

const rel=file=>path.relative(ROOT,file).replace(/\\/g,'/');

function walk(dir,predicate,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())walk(file,predicate,out);
    else if(entry.isFile()&&predicate(file))out.push(file);
  }
  return out;
}
function managedGridAliasesByPlugin(){
  const root=path.join(ROOT,'src','plugins'),map=new Map();
  if(!fs.existsSync(root))return map;
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const dir=path.join(root,entry.name),aliases=new Set();
    for(const file of walk(dir,p=>/\.(?:js|html)$/.test(p))){
      let source=fs.readFileSync(file,'utf8').replace(/\\"/g,'"').replace(/\\'/g,"'");
      for(const match of source.matchAll(/class\s*=\s*["']([^"']*\bdkds-managed-grid\b[^"']*)["']/g)){
        for(const cls of String(match[1]||'').split(/\s+/).filter(Boolean))if(cls!=='dkds-managed-grid')aliases.add(cls);
      }
      for(const match of source.matchAll(/className\s*=\s*["'`]([^"'`]*\bdkds-managed-grid\b[^"'`]*)["'`]/g)){
        for(const cls of String(match[1]||'').split(/\s+/).filter(Boolean))if(cls!=='dkds-managed-grid')aliases.add(cls);
      }
    }
    if(aliases.size)map.set(entry.name,aliases);
  }
  return map;
}

// Semantic owner contracts close the gap that selector-string collision checks
// cannot see: two different selectors may still match the same rendered UI.
// Context containers configure slots; leaf controls consume them. A leaf must
// never shadow a context slot, and final rendered properties stay with one file.
const CONTRACTS=Object.freeze([
  Object.freeze({
    id:'desktop-header-action-height',
    slot:'--dkds-header-action-height',
    finalProperties:Object.freeze(new Set(['height','min-height'])),
    finalOwner:'src/styles/structure/desktop-chrome-geometry.css',
    finalOwnerSelector:/:is\(\.dkds-integrated-action-group,\.dkds-separated-action-group,\.dkds-portable-controls,\.panel-header-actions,\.dkds-plot-view-actions\)>button/,
    targetSelector:/(?:\.dkds-(?:integrated-action-group|separated-action-group|portable-controls|plot-view-actions)\b|\.panel-header-actions\b)[^,{]*>\s*button\b|\.dkds-(?:portable-icon-action|panel-close-button|portable-placement-trigger|plot-view-action|portable-history-action|action-button)\b/,
    leafSelector:/\.dkds-(?:portable-icon-action|panel-close-button|portable-placement-trigger|plot-view-action|portable-history-action|action-button)\b/,
    allowedSlotContexts:Object.freeze([
      'src/styles/structure/analysis-shell.css',
      'src/styles/structure/plugin-workspace.css',
      'src/styles/structure/sdk-semantic-surfaces.css',
      'src/styles/structure/super-top-contract.css',
      'src/styles/structure/schema-and-plugin-ui.css',
      'src/styles/platform/native-client-shell.css',
      'src/styles/platform/native-workspace-presentation.css'
    ])
  })
]);

function audit(){
  const violations=[];
  const files=collectCssFiles();
  for(const file of files){
    const fileRel=rel(file),css=fs.readFileSync(file,'utf8');
    for(const block of ruleBlocks(css)){
      for(const rawSelector of splitSelectorList(block.selector)){
        const selector=canonicalSelector(rawSelector);
        if(!selector)continue;
        // Zero-specificity generic fallbacks explicitly exclude canonical
        // action descendants. Their selector text contains those class names
        // only inside :not(:where(...)); they are not competing owners.
        const zeroSpecificityFallback=selector.startsWith(':where(button):not(:where(');
        for(const [property,value] of block.declarations){
          for(const contract of CONTRACTS){
            if(property===contract.slot){
              if(contract.leafSelector.test(selector)){
                violations.push({contract:contract.id,file:fileRel,selector,property,value,reason:'leaf-shadows-context-slot'});
                contract.leafSelector.lastIndex=0;
                continue;
              }
              contract.leafSelector.lastIndex=0;
              if(!contract.allowedSlotContexts.includes(fileRel)){
                violations.push({contract:contract.id,file:fileRel,selector,property,value,reason:'slot-outside-context-owner-files'});
              }
              continue;
            }
            if(!contract.finalProperties.has(property)||zeroSpecificityFallback)continue;
            if(/::(?:before|after)\b/.test(selector)||selector.startsWith('button:not(:is('))continue;
            const directContainer=/(?:\.dkds-(?:integrated-action-group|separated-action-group|portable-controls|plot-view-actions)\b|\.panel-header-actions\b)[^,{]*>\s*button\b/.test(selector);
            const leadingLeaf=/^\.dkds-(?:portable-icon-action|panel-close-button|portable-placement-trigger|plot-view-action|portable-history-action|action-button)\b/.test(selector);
            if(!directContainer&&!leadingLeaf)continue;
            const canonicalOwner=fileRel===contract.finalOwner&&contract.finalOwnerSelector.test(selector);
            contract.finalOwnerSelector.lastIndex=0;
            if(!canonicalOwner)violations.push({contract:contract.id,file:fileRel,selector,property,value,reason:'final-property-outside-owner'});
          }
        }
      }
    }
  }
  const managedGridFinalProperties=new Set(['display','grid-template-columns','grid-auto-flow','grid-auto-rows','gap','row-gap','column-gap','align-items']);
  const managedAliases=managedGridAliasesByPlugin();
  for(const [plugin,aliases] of managedAliases){
    const cssFile=path.join(ROOT,'src','plugins',plugin,'plugin.css');if(!fs.existsSync(cssFile))continue;
    for(const block of ruleBlocks(fs.readFileSync(cssFile,'utf8'))){
      for(const rawSelector of splitSelectorList(block.selector)){
        const selector=canonicalSelector(rawSelector);if(!selector)continue;
        const hostAlias=[...aliases].find(cls=>selector.includes(`.${cls}`));if(!hostAlias)continue;
        // Child rules may use the host class as an ancestor. Only the managed
        // grid host itself is protected; descendants keep normal plugin layout ownership.
        const hostToken=`.${hostAlias}`,hostIndex=selector.indexOf(hostToken),tail=selector.slice(hostIndex+hostToken.length).trim();
        if(tail&&/^(?:>|\+|~|\s)/.test(tail))continue;
        for(const [property,value] of block.declarations)if(managedGridFinalProperties.has(property))violations.push({contract:'core-managed-grid-final-geometry',file:rel(cssFile),selector,property,value,reason:'managed-grid-final-property-outside-core'});
      }
    }
  }

  const analysisWorkbench=fs.readFileSync(path.join(ROOT,'src/styles/structure/analysis-workbench.css'),'utf8');
  if(/\.dkds-analysis-workbench\s+button\s*\{[\s\S]*?min-height\s*:/.test(analysisWorkbench)){
    violations.push({contract:'desktop-header-action-height',file:'src/styles/structure/analysis-workbench.css',selector:'.dkds-analysis-workbench button',property:'min-height',value:'*',reason:'broad-button-owner-overlaps-header-actions'});
  }
  return Object.freeze({contracts:CONTRACTS.length+1,violations:Object.freeze(violations),ok:violations.length===0});
}
function format(report){
  const lines=[`Semantic UI ownership contracts: ${report.contracts} contracts, ${report.violations.length} violations.`];
  for(const row of report.violations)lines.push(`- ${row.contract}: ${row.file} :: ${row.selector} :: ${row.property} (${row.reason})`);
  return lines.join('\n');
}
function validate(){const report=audit();if(!report.ok){const error=new Error(format(report));error.report=report;throw error;}return report;}
if(require.main===module){const report=audit();console.log(format(report));if(process.argv.includes('--strict')&&!report.ok)process.exit(1);}
module.exports=Object.freeze({CONTRACTS,audit,validate,format});
