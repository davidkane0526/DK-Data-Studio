'use strict';
const foundation=require('./foundation');
const projectTabs=require('./project-tabs-history');
const imports=require('./import-workbench');
const artifacts=require('./data-artifact-host');
const workspace=require('./workspace-super-shell');
const scientific=require('./scientific-panels-export');
const projects=require('./project-persistence');
const docks=require('./floating-docks');
const windows=require('./dedicated-plugin-windows');
const windowChrome=require('./window-chrome');

const deps=Object.freeze({foundation,projectTabs,imports,artifacts,workspace,scientific,projects,docks,windows,windowChrome});
for(const moduleApi of Object.values(deps))moduleApi.configure?.(deps);

module.exports=require('./startup');
