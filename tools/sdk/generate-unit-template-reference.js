'use strict';
const fs=require('fs');
const path=require('path');
const {UNIT_TEMPLATE_SPEC_VERSION,BASE_METRICS,METRIC_PROVENANCE,LAYOUT_RECIPES,ACCEPTED_LAYOUT_GEOMETRY_VALUES,ACCEPTED_LAYOUT_BREAKPOINTS,UNIT_CATALOG,UNIT_GEOMETRY_OWNERSHIP_POLICY,UNIT_CONTRACTS,ACCEPTED_SCIENTIFIC_SIGNATURE,CORE_SERVICE_CATALOG,FORMAL_CORE_SERVICE_METHODS,VISUAL_SERVICE_MIGRATIONS,UNIT_CHROME_POLICIES,STRUCTURAL_PRIMITIVE_POLICIES,PRESENTATION_ROLE_POLICIES,UNIT_STATE_SPEC_VERSION,STATE_CHANNELS,UNIT_STATE_POLICIES,ACCESSIBILITY_POLICIES,ACCESSIBILITY_ATTRIBUTES,ACCESSIBILITY_ROLES,ACCESSIBILITY_TABINDEX,KEYBOARD_KEYS}=require('../../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_BLUEPRINTS,NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS,PRIVATE_GEOMETRY_BRIDGES,NATIVE_PLUGIN_SERVICE_BLUEPRINTS,NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS,NATIVE_PLUGIN_STATE_BLUEPRINTS}=require('./native-blueprints');
const {scanAll:scanNativeStructure}=require('./native-structure-census');
const {scanAll:scanNativeState}=require('./native-state-census');
const root=path.resolve(__dirname,'../..');
const json=value=>JSON.stringify(value,null,2)+'\n';
const list=value=>Array.isArray(value)?value.join(', '):'';
const code=value=>'`'+String(value)+'`';
function renderMarkdown(){
  const lines=[];
  lines.push('# DK Data Studio Unit Template Catalog','',`Spec version: **${UNIT_TEMPLATE_SPEC_VERSION}**`,'','This file is generated from `src/core/ui/modules/composition/unit-template-spec.js`. Do not hand-edit it.','');
  lines.push('## Global contract','', '- Existing native plugin source and authored CSS are reference assets, not migration targets for SDK development.', '- Unit Templates may reuse accepted canonical classes and Core runtimes, but may not create a second visual owner.', '- Plugin composition is free. A shared unit is not free to redefine its radius, button geometry, spacing, chrome completeness or mandatory interaction semantics.', '- Presets are compositions of public Unit Templates only. A preset may not own private DOM/CSS/runtime behavior.', '- Native-plugin blueprints describe the target unit vocabulary for future 1:1 migration; nonvisual providers use the `provider` unit.','');
  lines.push('## Geometry ownership policy','',`Policy: **${UNIT_GEOMETRY_OWNERSHIP_POLICY.principle}** (${UNIT_GEOMETRY_OWNERSHIP_POLICY.version})`,'',`- Plugin role: ${code(UNIT_GEOMETRY_OWNERSHIP_POLICY.roles.plugin)} — choose only bounded Unit parameters; never write competing Surface geometry.` ,`- Unit role: ${code(UNIT_GEOMETRY_OWNERSHIP_POLICY.roles.unit)} — own intrinsic geometry, responsive state and the constraints derived from accepted parameters.`,`- Presenter role: ${code(UNIT_GEOMETRY_OWNERSHIP_POLICY.roles.presenter)} — resolve only the final outer Surface allocation from Unit constraints plus real platform availability.`,`- User geometry persistence: ${code(UNIT_GEOMETRY_OWNERSHIP_POLICY.roles.userPreference)} — a preference is clamped by the current contract and never becomes an owner.`,'','Bounded plugin tunables: '+UNIT_GEOMETRY_OWNERSHIP_POLICY.boundedTunables.map(code).join(', '),'','Immutable ownership: '+UNIT_GEOMETRY_OWNERSHIP_POLICY.immutable.map(code).join(', '),'');
  lines.push('## Frozen metric groups','');
  for(const [group,values] of Object.entries(BASE_METRICS)){
    lines.push(`### ${group}`,'','| Metric | Value |','|---|---:|');
    for(const [key,value] of Object.entries(values))lines.push(`| ${code(key)} | ${value} |`);
    const provenance=METRIC_PROVENANCE[group];
    if(provenance){lines.push(`Source files: ${(provenance.files||[]).map(code).join(', ')}`);if(provenance.selectors?.length)lines.push(`Selectors: ${provenance.selectors.map(code).join(', ')}`);if(provenance.runtime)lines.push(`Runtime note: ${provenance.runtime}`);}
    lines.push('');
  }
  lines.push('## Published layout recipes','', 'Layout recipes are Core-owned geometry distilled from accepted native-plugin layouts. Plugins choose a named recipe; arbitrary CSS geometry is not part of the Unit Template contract.','', '| Recipe | Base geometry | Responsive rules |','|---|---|---|');
  for(const [id,row] of Object.entries(LAYOUT_RECIPES)){const responsive=(row.responsive||[]).map(rule=>{const when=rule.maxWidth!==undefined?`≤${rule.maxWidth}px`:`≥${rule.minWidth}px`;const body=Object.entries(rule).filter(([key])=>!['maxWidth','minWidth'].includes(key)).map(([key,value])=>`${key}=${value}`).join(', ');return `${when}: ${body}`;}).join(' / ')||'—';const base=Object.entries(row).filter(([key])=>key!=='responsive').map(([key,value])=>`${key}=${value}`).join(', ');lines.push(`| ${code(id)} | ${base} | ${responsive} |`);} 
  lines.push('');
  lines.push('## Accepted geometry vocabulary','', `Layout geometry is Core-owned and restricted to **${Object.keys(ACCEPTED_LAYOUT_GEOMETRY_VALUES).length} properties / ${Object.values(ACCEPTED_LAYOUT_GEOMETRY_VALUES).reduce((sum,values)=>sum+values.length,0)} accepted values** distilled from frozen native-plugin geometry. Arbitrary CSS values are rejected at runtime.`, '', `Accepted responsive breakpoints: ${ACCEPTED_LAYOUT_BREAKPOINTS.map(value=>code(`${value}px`)).join(', ')}`, '');
  lines.push('| CSS property | Accepted values |','|---|---|');
  for(const [property,values] of Object.entries(ACCEPTED_LAYOUT_GEOMETRY_VALUES))lines.push(`| ${code(property)} | ${values.map(code).join(', ')} |`);
  lines.push('','### Private geometry migration bridges','', 'Legacy plugin-private geometry variables are migration evidence only. Unit Templates expose resolved public geometry; the private variable names are never part of the public geometry vocabulary.','', '| Private reference token | Public mechanism | Unit | Resolved values |','|---|---|---|---|');
  for(const [token,row] of Object.entries(PRIVATE_GEOMETRY_BRIDGES))lines.push(`| ${code(token)} | ${code(row.mechanism)} | ${code(row.unit)} | ${(row.resolvedValues||[]).map(code).join(', ')} |`);
  lines.push('');
  lines.push('## Unit catalog','');
  for(const [name,row] of Object.entries(UNIT_CATALOG)){
    lines.push(`### ${name}`,'',`- ID: ${code(row.id)}`,`- Kind: ${code(row.kind)}`,`- Owner: ${code(row.owner)}`);
    if(row.metricsRef)lines.push(`- Metric group: ${code(row.metricsRef)}`);if(row.metricsRefs?.length)lines.push(`- Metric groups: ${row.metricsRefs.map(code).join(', ')}`);if(row.geometryContract)lines.push(`- Geometry contract: ${code(row.geometryContract)}`);
    if(row.classes?.length)lines.push(`- Canonical classes: ${row.classes.map(code).join(', ')}`);
    if(row.variants?.length)lines.push(`- Variants: ${row.variants.map(code).join(', ')}`);
    if(row.roles?.length)lines.push(`- Roles: ${row.roles.map(code).join(', ')}`);
    if(row.anatomy?.length)lines.push(`- Anatomy: ${row.anatomy.map(code).join(' → ')}`);
    if(row.required?.length)lines.push(`- Required: ${row.required.map(code).join(', ')}`);
    if(row.header)lines.push(`- Header contract: ${Array.isArray(row.header)?row.header.map(code).join(' or '):code(row.header)}`);
    if(row.position)lines.push(`- Position control: ${code(row.position)}`);
    if(row.export)lines.push(`- Export control: ${code(row.export)}`);
    if(row.interactionPolicy)lines.push(`- Interaction policy: ${code(row.interactionPolicy)}`);
    if(row.densities?.length)lines.push(`- Densities: ${row.densities.map(code).join(', ')}`);
    lines.push(`- Plugin owns: ${list(row.pluginOwns)||'nothing'}`,`- Core owns: ${list(row.coreOwns)||'nothing'}`);
    const contract=UNIT_CONTRACTS[name];
    if(contract){
      lines.push(`- Purpose: ${contract.purpose}`);
      if(contract.slots?.length)lines.push(`- Slots: ${contract.slots.map(code).join(', ')}`);
      if(contract.responsive)lines.push(`- Responsive: ${contract.responsive}`);
      if(contract.accessibility?.length)lines.push(`- Accessibility: ${contract.accessibility.join(' ')}`);
      if(contract.invariants?.length)lines.push(`- Invariants: ${contract.invariants.join(' ')}`);
      if(contract.extensionPoints?.length)lines.push(`- Extension points: ${contract.extensionPoints.join(', ')}`);
      if(contract.forbidden?.length)lines.push(`- Forbidden: ${contract.forbidden.join(', ')}`);
    }
    lines.push('');
  }
  lines.push('## Unit state and accessibility contract','',`State spec version: **${UNIT_STATE_SPEC_VERSION}**`,'','Plugins update semantic state through the Unit state controller; Core reflects native properties, ARIA and accepted canonical classes.','', '| State | Type | Reflection | Rule |','|---|---|---|---|');
  for(const [id,row] of Object.entries(STATE_CHANNELS))lines.push(`| ${code(id)} | ${code(row.type)} | ${(row.reflect||[]).map(code).join(', ')} | ${row.rule} |`);
  lines.push('','### Per-unit state policies','', '| Unit | Allowed states | Required accessibility | Keyboard owner |','|---|---|---|---|');for(const [id,row] of Object.entries(UNIT_STATE_POLICIES))lines.push(`| ${code(id)} | ${(row.allowed||[]).map(code).join(', ')} | ${(row.requiredA11y||[]).map(code).join(', ')} | ${code(row.keyboard||'none')} |`);
  lines.push('','### Accessibility policies','');for(const [id,row] of Object.entries(ACCESSIBILITY_POLICIES)){lines.push(`#### ${id}`,'',`- Roles: ${(row.roles||[]).map(code).join(', ')||'none'}`);for(const req of row.requirements||[])lines.push(`- ${req}`);lines.push('');}lines.push('Allowed ARIA attributes: '+Object.keys(ACCESSIBILITY_ATTRIBUTES).map(code).join(', '),'',`Allowed tabindex values: ${ACCESSIBILITY_TABINDEX.map(code).join(', ')}`,'',`Keyboard vocabulary: ${KEYBOARD_KEYS.map(code).join(', ')}`,'');
  const stateCensus=scanNativeState();lines.push('### Native state/accessibility census','', 'This census is generated from frozen native plugin source and is migration evidence for dynamic state, ARIA and keyboard semantics.','', '| Native plugin | State mutations | Role/tabindex semantics | Other ARIA semantics | Keyboard tokens |','|---|---:|---:|---:|---:|');for(const [id,row] of Object.entries(stateCensus))lines.push(`| ${code(id)} | ${row.counts.states} | ${row.counts.roles} | ${row.counts.a11y} | ${row.counts.keyboard} |`);lines.push('');
  lines.push('## Canonical chrome/anatomy policies','', 'These policies define mandatory Core chrome. Domain actions may fill only the declared extension slots; they cannot replace mandatory Core actions.','');
  for(const [id,row] of Object.entries(UNIT_CHROME_POLICIES)){lines.push(`### ${id}`,'',`- Unit: ${code(row.unit)}`);if(row.role)lines.push(`- Role: ${code(row.role)}`);if(row.header)lines.push(`- Header: ${code(row.header)}`);if(row.coreActions)lines.push(`- Mandatory Core actions: ${row.coreActions.map(code).join(' → ')||'none'}`);if(row.optionalCoreActions)lines.push(`- Optional Core actions: ${row.optionalCoreActions.map(code).join(', ')}`);if(row.logicalOrder)lines.push(`- Logical action order: ${row.logicalOrder.map(code).join(' → ')||'none'}`);for(const inv of row.invariants||[])lines.push(`- ${inv}`);lines.push('');}
  lines.push('## Structural primitive policies','', '| Native primitive | Unit | Factory | Rule |','|---|---|---|---|');for(const [id,row] of Object.entries(STRUCTURAL_PRIMITIVE_POLICIES))lines.push(`| ${code(id)} | ${code(row.unit)} | ${code(row.factory)} | ${row.rule} |`);lines.push('');
  lines.push('## Presentation role policies','', '| Role | Native/Mobile region | Navigation |','|---|---|---|');for(const [role,row] of Object.entries(PRESENTATION_ROLE_POLICIES))lines.push(`| ${code(role)} | ${code(row.mobileRegion)}${row.dataPrimaryMobileRegion?` / data-primary: ${code(row.dataPrimaryMobileRegion)}`:''} | ${code(row.navigation)} |`);lines.push('');
  lines.push('### Native presentation blueprints','');for(const [id,bp] of Object.entries(NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS)){lines.push(`#### ${id}`,'');for(const row of bp.surfaces||[])lines.push(`- Surface ${code(row.id)}: ${code(row.kind)} / ${code(row.role)} / priority ${row.priority}${row.collapsible?' / collapsible':''}`);for(const row of bp.contributions||[])lines.push(`- Host contribution ${code(row.kind)} ${code(row.id)}: ${code(row.side)} / order ${row.order}`);if(!(bp.surfaces?.length||bp.contributions?.length))lines.push('- No visual presentation contribution.');lines.push('');}
  lines.push('## Accepted scientific preset signature','',`The ${code('accepted-scientific-v1')} preset is a public composition example built only from Unit Templates.`,'',`- Units: ${ACCEPTED_SCIENTIFIC_SIGNATURE.units.map(code).join(', ')}`,`- Group density: ${code(ACCEPTED_SCIENTIFIC_SIGNATURE.groupDensity)}`,`- Plot interaction: ${code(ACCEPTED_SCIENTIFIC_SIGNATURE.plotInteractionPolicy)}`,`- PRIME order: ${ACCEPTED_SCIENTIFIC_SIGNATURE.primeOrder.map(code).join(' → ')}`,'');
  lines.push('## Native plugin migration blueprints','', '| Native plugin | Kind | Required Unit vocabulary | Parity target |','|---|---|---|---|');
  for(const [id,row] of Object.entries(NATIVE_PLUGIN_BLUEPRINTS))lines.push(`| ${code(id)} | ${code(row.kind)} | ${row.units.map(code).join(', ')} | ${(row.parity||[]).map(code).join(', ')} |`);
  lines.push('','### Native region recipes','');
  for(const [id,row] of Object.entries(NATIVE_PLUGIN_BLUEPRINTS)){
    lines.push(`#### ${id}`,'');
    if(!row.regions?.length){lines.push('- No visual regions.','');continue;}
    for(const region of row.regions){const extras=[];if(region.role)extras.push(`role=${region.role}`);if(region.placements)extras.push(`placements=${region.placements.join('/')}`);if(region.header)extras.push(`header=${region.header}`);if(region.density)extras.push(`density=${region.density}`);lines.push(`- ${code(region.id)} → ${code(region.unit)} / ${code(region.variant)}${extras.length?` (${extras.join(', ')})`:''}`);}
    lines.push('');
  }

  const structure=scanNativeStructure();lines.push('','## Native structural control census','', 'This census is generated directly from the frozen native plugin source. It is reconstruction evidence, not a second runtime implementation.','', '| Native plugin | Buttons | Fields | Selects | Checks | Tables |','|---|---:|---:|---:|---:|---:|');for(const [id,row] of Object.entries(structure))lines.push(`| ${code(id)} | ${row.counts.buttons} | ${row.counts.inputs+row.counts.textareas} | ${row.counts.selects} | ${row.counts.checks} | ${row.counts.tables} |`);lines.push('');
  lines.push('','## Native private-geometry migration census','', 'Every geometry-bearing rule in the frozen native plugin CSS must map to a public Unit or public layout recipe before that plugin can be migrated without copying private geometry.','', '| Native plugin | Geometry mappings |','|---|---:|');
  for(const [id,rows] of Object.entries(NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS))lines.push(`| ${code(id)} | ${rows.length} |`);
  lines.push('','### Geometry mapping details','');
  for(const [id,rows] of Object.entries(NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS)){
    lines.push(`#### ${id}`,'');
    for(const row of rows)lines.push(`- ${code(row.match)} → ${code(row.unit)} / ${code(row.variant)} (role=${code(row.role)}, mechanism=${code(row.mechanism)})`);
    lines.push('');
  }
  lines.push('','## Core behavior service catalog','', 'Unit Templates own reusable visual/composition units. Domain state and host/runtime behavior continue to use formal Core services. Every native plugin service dependency is inventoried so future Unit migration never reimplements a Core service privately.','', '| Service | Kind | Purpose |','|---|---|---|');
  for(const [id,row] of Object.entries(CORE_SERVICE_CATALOG))lines.push(`| ${code(id)} | ${code(row.kind)} | ${row.purpose} |`);
  lines.push('','### Formal retained Core service methods','', 'Every direct native call that is not a Unit migration must appear here. This closes the third-path loophole.','', '| Method | Kind | Rule |','|---|---|---|');for(const [id,row] of Object.entries(FORMAL_CORE_SERVICE_METHODS))lines.push(`| ${code(id)} | ${code(row.kind)} | ${row.rule} |`);lines.push('');
  lines.push('','### Native plugin service blueprints','');
  for(const [id,row] of Object.entries(NATIVE_PLUGIN_SERVICE_BLUEPRINTS)){lines.push(`#### ${id}`,'',`- Services: ${(row.services||[]).map(code).join(', ')||'none'}`);for(const migration of row.migrations||[])lines.push(`- Migration: ${code(migration.from)} → Unit ${code(migration.to)} × ${migration.count}`);lines.push('');}
  lines.push('### Visual service migration map','');for(const [from,to] of Object.entries(VISUAL_SERVICE_MIGRATIONS))lines.push(`- ${code(from)} → ${code(to)}`);lines.push('');
  lines.push('','## Scientific hard invariants','', '- `plotView`: a Unit PlotView is a complete data-plot unit. Header, title, movable position control and export affordance are mandatory.', '- `plotGroup`: every scientific child is a complete Unit PlotView. Group header is either complete standard chrome or completely absent; no partial header is legal.', '- `plotGroup`: row/column spacing is selected only through semantic density. Raw plugin-owned gap values are rejected.', '- `scientificPlot`: base `scientific-standard-v1` gestures are Core-owned. Plugins may add only non-conflicting domain interactions.', '- `portable`: drag, resize, placement, history and z-order remain Core-owned even when Unit Templates request accepted initial geometry.', '');
  return lines.join('\n')+'\n';
}
function reconstructionBlueprints(){
  const structure=scanNativeStructure(),state=scanNativeState(),out={};
  const ids=[...new Set([...Object.keys(NATIVE_PLUGIN_BLUEPRINTS),...Object.keys(NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS),...Object.keys(NATIVE_PLUGIN_SERVICE_BLUEPRINTS),...Object.keys(NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS),...Object.keys(NATIVE_PLUGIN_STATE_BLUEPRINTS),...Object.keys(structure),...Object.keys(state)])].sort();
  for(const id of ids)out[id]=Object.freeze({unit:NATIVE_PLUGIN_BLUEPRINTS[id]||null,geometry:NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS[id]||[],services:NATIVE_PLUGIN_SERVICE_BLUEPRINTS[id]||null,presentation:NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS[id]||null,state:NATIVE_PLUGIN_STATE_BLUEPRINTS[id]||null,structure:structure[id]||null,stateCensus:state[id]||null});
  return Object.freeze(out);
}
function outputs(){return new Map([
  ['sdk/unit-template-catalog.json',json({version:UNIT_TEMPLATE_SPEC_VERSION,metrics:BASE_METRICS,metricProvenance:METRIC_PROVENANCE,layoutRecipes:LAYOUT_RECIPES,geometryOwnershipPolicy:UNIT_GEOMETRY_OWNERSHIP_POLICY,catalog:UNIT_CATALOG,contracts:UNIT_CONTRACTS,chromePolicies:UNIT_CHROME_POLICIES,structuralPrimitivePolicies:STRUCTURAL_PRIMITIVE_POLICIES,acceptedScientific:ACCEPTED_SCIENTIFIC_SIGNATURE,stateSpecVersion:UNIT_STATE_SPEC_VERSION,stateChannels:STATE_CHANNELS,statePolicies:UNIT_STATE_POLICIES,accessibilityPolicies:ACCESSIBILITY_POLICIES,accessibilityAttributes:ACCESSIBILITY_ATTRIBUTES,accessibilityRoles:ACCESSIBILITY_ROLES,accessibilityTabIndex:ACCESSIBILITY_TABINDEX,keyboardKeys:KEYBOARD_KEYS})],
  ['sdk/native-plugin-unit-blueprints.json',json({version:UNIT_TEMPLATE_SPEC_VERSION,blueprints:NATIVE_PLUGIN_BLUEPRINTS})],
  ['sdk/native-plugin-geometry-blueprints.json',json({version:UNIT_TEMPLATE_SPEC_VERSION,geometryBlueprints:NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS,privateGeometryBridges:PRIVATE_GEOMETRY_BRIDGES})],
  ['sdk/native-plugin-service-blueprints.json',json({version:UNIT_TEMPLATE_SPEC_VERSION,serviceCatalog:CORE_SERVICE_CATALOG,formalMethods:FORMAL_CORE_SERVICE_METHODS,blueprints:NATIVE_PLUGIN_SERVICE_BLUEPRINTS,visualMigrations:VISUAL_SERVICE_MIGRATIONS})],
  ['sdk/native-plugin-presentation-blueprints.json',json({version:UNIT_TEMPLATE_SPEC_VERSION,rolePolicies:PRESENTATION_ROLE_POLICIES,blueprints:NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS})],
  ['sdk/native-plugin-structure-census.json',json({version:UNIT_TEMPLATE_SPEC_VERSION,primitivePolicies:STRUCTURAL_PRIMITIVE_POLICIES,chromePolicies:UNIT_CHROME_POLICIES,plugins:scanNativeStructure()})],
  ['sdk/native-plugin-state-census.json',json({version:UNIT_TEMPLATE_SPEC_VERSION,stateSpecVersion:UNIT_STATE_SPEC_VERSION,stateChannels:STATE_CHANNELS,statePolicies:UNIT_STATE_POLICIES,accessibilityPolicies:ACCESSIBILITY_POLICIES,accessibilityAttributes:ACCESSIBILITY_ATTRIBUTES,accessibilityRoles:ACCESSIBILITY_ROLES,accessibilityTabIndex:ACCESSIBILITY_TABINDEX,keyboardKeys:KEYBOARD_KEYS,blueprints:NATIVE_PLUGIN_STATE_BLUEPRINTS,plugins:scanNativeState()})],
  ['sdk/unit-template-geometry-values.json',json({version:UNIT_TEMPLATE_SPEC_VERSION,properties:ACCEPTED_LAYOUT_GEOMETRY_VALUES,breakpoints:ACCEPTED_LAYOUT_BREAKPOINTS})],
  ['sdk/native-plugin-reconstruction-blueprints.json',json({version:UNIT_TEMPLATE_SPEC_VERSION,plugins:reconstructionBlueprints()})],
  ['sdk/UNIT_TEMPLATE_CATALOG.md',renderMarkdown()]
]);}
function run({check=false}={}){
  const stale=[];
  for(const [file,text] of outputs()){
    const target=path.join(root,file);
    if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==text)stale.push(file);continue;}
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);
  }
  if(check&&stale.length){console.error(`Stale Unit Template reference: ${stale.join(', ')}`);return false;}
  console.log(`${check?'Verified':'Generated'} SDK Unit Template reference ${UNIT_TEMPLATE_SPEC_VERSION}: ${Object.keys(UNIT_CATALOG).length} units, ${Object.keys(NATIVE_PLUGIN_BLUEPRINTS).length} native blueprints.`);return true;
}
if(require.main===module){const ok=run({check:process.argv.includes('--check')});if(!ok)process.exitCode=1;}
module.exports=Object.freeze({renderMarkdown,reconstructionBlueprints,outputs,run});
