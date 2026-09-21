#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const {UNIT_TEMPLATE_SPEC_VERSION,UNIT_CATALOG}=require('../../src/core/ui/modules/composition/unit-template-spec');
const CONTRACT=JSON.parse(fs.readFileSync(path.join(ROOT,'sdk','contract.json'),'utf8'));
const TARGETS=Object.freeze([
  Object.freeze({name:'builtin-template',dir:'src/plugins/_template',top:false}),
  Object.freeze({name:'workspace-template',dir:'sdk/templates/workspace-plugin',top:false}),
  Object.freeze({name:'top-workspace-template',dir:'sdk/templates/top-workspace-plugin',top:true}),
  Object.freeze({name:'tool-workspace-template',dir:'sdk/templates/tool-plugin',top:true})
]);
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function auditTarget(target){
  const failures=[],dir=path.join(ROOT,target.dir),manifest=JSON.parse(read(`${target.dir}/plugin.json`)),source=read(`${target.dir}/plugin.js`);
  const requireToken=token=>{if(!source.includes(token))failures.push(`missing-source-token:${token}`);};
  if(!(manifest.requiresCore||[]).includes('ui.unit-templates'))failures.push('manifest-missing-ui.unit-templates');
  for(const token of ['ctx.ui.unitTemplates','units.page.create','units.pageHeader.create','units.layout.create','units.workspace.create'])requireToken(token);
  if(!/\b(?:workbench|workspace)\.compose\s*\(/.test(source))failures.push('missing-unit-workspace-compose');
  if(source.includes('ctx.ui.workspaceSurface.create'))failures.push('default-template-teaches-low-level-workspaceSurface');
  if(/html\s*:\s*['"`]\s*</.test(source))failures.push('default-template-teaches-raw-page-html');
  if(/\bctx\.ui\.dom\b/.test(source))failures.push('default-template-teaches-raw-dom-composition');
  if(/\bgeometry\s*:|\bresponsiveGeometry\s*:/.test(source))failures.push('default-template-teaches-detail-geometry-before-unit-defaults');
  const styles=Array.isArray(manifest.styles)?manifest.styles:[];
  if(styles.length)failures.push(`default-template-manifest-styles:${styles.join(',')}`);
  const cssFiles=fs.readdirSync(dir).filter(name=>name.endsWith('.css'));
  if(cssFiles.length)failures.push(`default-template-private-css:${cssFiles.join(',')}`);
  if(target.top){
    for(const token of ['ctx.ui.activities.add','ctx.ui.topWorkspace.register',"openMode:'window'"])requireToken(token);
  }
  return Object.freeze({name:target.name,dir:target.dir,failures:Object.freeze(failures)});
}
function audit(){
  const reports=TARGETS.map(auditTarget),failures=[];
  if(String(CONTRACT.sdkVersion)!=='1.51.44')failures.push(`sdk-version:${CONTRACT.sdkVersion}`);
  if(String(UNIT_TEMPLATE_SPEC_VERSION)!=='2.5.38')failures.push(`unit-template-version:${UNIT_TEMPLATE_SPEC_VERSION}`);
  if(Object.keys(UNIT_CATALOG||{}).length!==41)failures.push(`unit-catalog-size:${Object.keys(UNIT_CATALOG||{}).length}`);
  for(const report of reports)for(const failure of report.failures)failures.push(`${report.name}:${failure}`);
  return Object.freeze({version:'1.0.0',sdkVersion:CONTRACT.sdkVersion,unitTemplateVersion:UNIT_TEMPLATE_SPEC_VERSION,unitCount:Object.keys(UNIT_CATALOG||{}).length,targets:reports.length,ok:failures.length===0,failures:Object.freeze(failures),reports:Object.freeze(reports)});
}
function format(report){return [`Unit-first SDK authoring audit: ${report.targets} templates / SDK ${report.sdkVersion} / Units ${report.unitCount} / ${report.failures.length} violations.`,...report.failures.map(row=>`- ${row}`)].join('\n');}
function validate(){const report=audit();if(!report.ok){const error=new Error(format(report));error.report=report;throw error;}return report;}
if(require.main===module){const report=audit();console.log(format(report));if(process.argv.includes('--strict')&&!report.ok)process.exit(1);}
module.exports=Object.freeze({TARGETS,audit,auditTarget,validate,format});
