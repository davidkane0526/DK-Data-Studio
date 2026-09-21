#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const PLUGIN_ROOT=path.join(ROOT,'src','plugins');
const {UNIT_TEMPLATE_SPEC_VERSION}=require('../../src/core/ui/modules/composition/unit-template-spec');
const BLUEPRINTS=JSON.parse(fs.readFileSync(path.join(ROOT,'sdk','native-plugin-unit-blueprints.json'),'utf8'));
const PRODUCTION=Object.freeze([
  Object.freeze({dir:'data-center',blueprint:'data-center'}),
  Object.freeze({dir:'pulse-analysis',blueprint:'pulse-analysis'}),
  Object.freeze({dir:'pulse-sampler-tool',blueprint:'pulse-sampler-tool'}),
  Object.freeze({dir:'resonance-workbench',blueprint:'resonance-workbench'}),
  Object.freeze({dir:'ter-analysis',blueprint:'ter-analysis'}),
  Object.freeze({dir:'transfer-vth-lab',blueprint:'transfer-vth-lab'})
]);
const SECOND_OWNER_PATTERNS=Object.freeze([
  Object.freeze(['unit-workspace-create',/\bunits\.workspace\.create\s*\(/]),
  Object.freeze(['unit-prime-build',/\bunits\.prime\.build\s*\(/]),
  Object.freeze(['workspace-compose',/\b(?:workbench|wb)\.compose\s*\(/]),
  Object.freeze(['legacy-workspace-surface-create',/\bctx\.ui\.workspaceSurface\.create\s*\(/]),
  Object.freeze(['legacy-register-prime',/\bworkbench\.registerPrime\s*\(/]),
  Object.freeze(['legacy-unit-prime-register',/\bunits\.prime\.register\s*\(/]),
  Object.freeze(['legacy-plotgroup-prime-register',/\bunits\.plotGroup\.registerPrime\s*\(/])
]);
const read=file=>fs.readFileSync(file,'utf8');
const stripComments=source=>String(source||'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
function auditPlugin(spec){
  const dir=path.join(PLUGIN_ROOT,spec.dir),failures=[];
  const manifestPath=path.join(dir,'plugin.json'),unitPath=path.join(dir,'unit-presentation.js');
  if(!fs.existsSync(manifestPath))return Object.freeze({plugin:spec.dir,failures:Object.freeze(['manifest-missing'])});
  if(!fs.existsSync(unitPath))return Object.freeze({plugin:spec.dir,failures:Object.freeze(['unit-presentation-missing'])});
  const manifest=JSON.parse(read(manifestPath)),unit=read(unitPath);
  if(!(manifest.requiresCore||[]).includes('ui.unit-templates'))failures.push('manifest-missing-ui.unit-templates');
  const scriptSets=[['scripts',manifest.scripts],['window.scripts',manifest.window?.scripts]].filter(([,rows])=>Array.isArray(rows));
  for(const [label,rows] of scriptSets)if(!rows.includes('unit-presentation.js'))failures.push(`${label}-missing-unit-presentation`);
  if(!unit.includes('ctx.ui.unitTemplates'))failures.push('unit-presentation-does-not-consume-public-unit-runtime');
  if(!unit.includes('units.workspace.create'))failures.push('unit-presentation-does-not-own-workspace');
  if(!unit.includes('units.prime.build'))failures.push('unit-presentation-does-not-own-prime');
  if(!/\b(?:workbench|wb)\.compose\s*\(/.test(unit))failures.push('unit-presentation-does-not-compose-workspace');
  const blueprint=BLUEPRINTS.blueprints?.[spec.blueprint];
  if(!blueprint)failures.push('native-unit-blueprint-missing');
  else{
    const unitSet=new Set(blueprint.units||[]);
    for(const id of ['workspace','layout','prime'])if(!unitSet.has(id))failures.push(`native-unit-blueprint-missing-${id}`);
    const regionUnits=new Set((blueprint.regions||[]).map(row=>row?.unit).filter(Boolean));
    if(!regionUnits.has('workspace'))failures.push('native-unit-blueprint-workspace-region-missing');
    if(!regionUnits.has('prime'))failures.push('native-unit-blueprint-prime-region-missing');
    for(const axis of ['function','structure','geometry','style','interaction','responsive','mobile'])if(!(blueprint.parity||[]).includes(axis))failures.push(`native-unit-blueprint-parity-missing-${axis}`);
  }
  for(const name of fs.readdirSync(dir).filter(name=>name.endsWith('.js')&&name!=='unit-presentation.js')){
    const source=stripComments(read(path.join(dir,name)));
    for(const [code,re] of SECOND_OWNER_PATTERNS)if(re.test(source))failures.push(`second-composition-owner:${name}:${code}`);
  }
  for(const rows of scriptSets)for(const name of rows[1])if(/shadow/i.test(String(name)))failures.push(`production-manifest-references-shadow:${name}`);
  return Object.freeze({plugin:spec.dir,manifestId:manifest.id||'',failures:Object.freeze(failures)});
}
function audit(){
  const failures=[];
  if(String(BLUEPRINTS.version)!==String(UNIT_TEMPLATE_SPEC_VERSION))failures.push(`blueprint-version-drift:${BLUEPRINTS.version}!=${UNIT_TEMPLATE_SPEC_VERSION}`);
  const reports=PRODUCTION.map(auditPlugin);
  for(const report of reports)for(const failure of report.failures)failures.push(`${report.plugin}:${failure}`);
  return Object.freeze({version:'1.0.0',unitTemplateVersion:UNIT_TEMPLATE_SPEC_VERSION,plugins:reports.length,ok:failures.length===0,failures:Object.freeze(failures),reports:Object.freeze(reports)});
}
function format(report){
  const lines=[`Production Unit cutover audit: ${report.plugins} plugins / Unit Templates ${report.unitTemplateVersion} / ${report.failures.length} violations.`];
  for(const failure of report.failures)lines.push(`- ${failure}`);
  return lines.join('\n');
}
function validate(){const report=audit();if(!report.ok){const error=new Error(format(report));error.report=report;throw error;}return report;}
if(require.main===module){const report=audit();console.log(format(report));if(process.argv.includes('--strict')&&!report.ok)process.exit(1);}
module.exports=Object.freeze({PRODUCTION,SECOND_OWNER_PATTERNS,audit,auditPlugin,validate,format});
