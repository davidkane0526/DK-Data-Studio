'use strict';
const assert=require('assert');
const {NATIVE_PLUGIN_BLUEPRINTS,NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS,NATIVE_PLUGIN_SERVICE_BLUEPRINTS,NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS,NATIVE_PLUGIN_STATE_BLUEPRINTS}=require('../tools/sdk/native-blueprints');
const {scanAll:scanStructure}=require('../tools/sdk/native-structure-census');
const {scanAll:scanState}=require('../tools/sdk/native-state-census');
const maps={unit:NATIVE_PLUGIN_BLUEPRINTS,services:NATIVE_PLUGIN_SERVICE_BLUEPRINTS,presentation:NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS,state:NATIVE_PLUGIN_STATE_BLUEPRINTS,structure:scanStructure(),stateCensus:scanState()};
const ids=Object.keys(maps.unit).sort();assert.strictEqual(ids.length,18,'reconstruction dossier must cover all native plugin directories');
for(const [name,map] of Object.entries(maps))assert.deepStrictEqual(Object.keys(map).sort(),ids,`${name} blueprint/census plugin set drifted`);
for(const id of Object.keys(NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS))assert(ids.includes(id),`geometry blueprint references unknown native plugin ${id}`);
for(const id of ids){
  const unit=maps.unit[id],geometry=NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS[id]||[],service=maps.services[id],presentation=maps.presentation[id],state=maps.state[id],structure=maps.structure[id];
  assert(unit.kind&&Array.isArray(unit.units)&&Array.isArray(unit.regions)&&Array.isArray(unit.parity),`${id} Unit blueprint incomplete`);
  assert(service&&Array.isArray(service.services)&&Array.isArray(service.migrations),`${id} service blueprint incomplete`);
  assert(presentation&&Array.isArray(presentation.surfaces)&&Array.isArray(presentation.contributions),`${id} presentation blueprint incomplete`);
  assert(state&&Array.isArray(state.channels)&&Array.isArray(state.roles)&&Array.isArray(state.aria)&&Array.isArray(state.keys),`${id} state blueprint incomplete`);
  assert(structure?.counts,`${id} structure census missing`);assert(Array.isArray(geometry),`${id} geometry dossier must normalize to an array`);
  const hasVisualStructure=Object.values(structure.counts).some(Number)||unit.regions.length>0||presentation.surfaces.length>0||presentation.contributions.length>0;
  if(hasVisualStructure)assert(unit.units.length>0,`${id} has visual structure but no Unit vocabulary`);
  if(state.counts.states>0)assert(state.channels.length>0,`${id} has state mutations but no state channels`);
  for(const migration of service.migrations||[])assert(unit.units.includes(migration.to),`${id} service migration ${migration.from} targets Unit ${migration.to} missing from plugin Unit vocabulary`);
}
console.log(`SDK 1.51 native reconstruction completeness PASS (${ids.length} plugin dossiers / 7 parity layers)`);
