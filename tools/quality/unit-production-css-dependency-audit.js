#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const production=require('./unit-production-cutover-audit');
const runtimeOwnership=require('./unit-runtime-style-ownership');
const semanticCascade=require('./unit-semantic-cascade-audit');

const ROOT=path.resolve(__dirname,'../..');
const PLUGIN_ROOT=path.join(ROOT,'src','plugins');
const UNIT_RUNTIME_TOKENS=/--dkds-(?:grid-(?:gap|align-items|auto-rows|columns)|plot-content-(?:flex|min-height|height))\s*:/g;
const PRESENTER_OUTER_SELECTORS=/\.dkds-mobile-surface-frame|\[data-dkds-mobile-frame-region|\.dkds-plugin-canvas-(?:frame|center|left|right|bottom|overlay)/g;
const UNIT_INTERNAL_SELECTORS=/\[data-dkds-unit-(?:template|layout-recipe|prime-[^\]]*)/g;

function activeStyles(manifest={}){
  const rows=[...(Array.isArray(manifest.styles)?manifest.styles:[])];
  for(const key of ['desktop','mobile'])for(const name of manifest.platformPresentation?.[key]?.styles||[])rows.push(name);
  return [...new Set(rows.map(String))].sort();
}
function scanCss(text=''){
  const violations=[];
  for(const match of String(text).matchAll(UNIT_RUNTIME_TOKENS))violations.push({type:'unit-runtime-token-reowned',token:match[0].split(':')[0]});
  for(const match of String(text).matchAll(PRESENTER_OUTER_SELECTORS))violations.push({type:'presenter-outer-selector-reowned',selector:match[0]});
  for(const match of String(text).matchAll(UNIT_INTERNAL_SELECTORS))violations.push({type:'unit-internal-selector-reowned',selector:match[0]});
  return violations;
}
function auditPlugin(spec){
  const dir=path.join(PLUGIN_ROOT,spec.dir),manifest=JSON.parse(fs.readFileSync(path.join(dir,'plugin.json'),'utf8'));
  const active=activeStyles(manifest),cssFiles=fs.readdirSync(dir).filter(name=>name.endsWith('.css')).sort(),failures=[];
  for(const name of active)if(!fs.existsSync(path.join(dir,name)))failures.push(`active-style-missing:${name}`);
  for(const name of cssFiles)if(!active.includes(name))failures.push(`dead-unreachable-style:${name}`);
  for(const name of active){
    const file=path.join(dir,name);if(!fs.existsSync(file))continue;
    for(const row of scanCss(fs.readFileSync(file,'utf8')))failures.push(`${name}:${row.type}:${row.token||row.selector}`);
  }
  return Object.freeze({plugin:spec.dir,active:Object.freeze(active),cssFiles:Object.freeze(cssFiles),failures:Object.freeze(failures)});
}
function audit(){
  const reports=production.PRODUCTION.map(auditPlugin),failures=[];
  const runtime=runtimeOwnership.audit();if(!runtime.ok)for(const row of runtime.violations)failures.push(`runtime-owner:${row.plugin}:${row.type}`);
  const cascade=semanticCascade.audit();if(!cascade.ok)for(const row of cascade.failures)failures.push(`semantic-cascade:${row}`);
  for(const report of reports)for(const failure of report.failures)failures.push(`${report.plugin}:${failure}`);
  return Object.freeze({version:'1.0.0',plugins:reports.length,activeStyles:reports.reduce((n,row)=>n+row.active.length,0),deadStyles:reports.reduce((n,row)=>n+row.cssFiles.filter(name=>!row.active.includes(name)).length,0),runtimeOwnershipViolations:runtime.violations.length,semanticCascadeViolations:cascade.failures.length,ok:failures.length===0,failures:Object.freeze(failures),reports:Object.freeze(reports)});
}
function format(report){return [`Production CSS dependency audit: ${report.plugins} plugins / ${report.activeStyles} active styles / ${report.deadStyles} dead styles / ${report.failures.length} violations.`,...report.failures.map(row=>`- ${row}`)].join('\n');}
function validate(){const report=audit();if(!report.ok){const error=new Error(format(report));error.report=report;throw error;}return report;}
if(require.main===module){const report=audit();console.log(format(report));if(process.argv.includes('--strict')&&!report.ok)process.exit(1);}
module.exports=Object.freeze({activeStyles,scanCss,auditPlugin,audit,validate,format});
