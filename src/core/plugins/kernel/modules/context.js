'use strict';

const state={
  preferences:null,
  prewarmPreferences:null,
  host:null,
  loadingPromise:null,
  externalLoadingPromise:null,
  activeActivityId:null,
  superPluginId:null,
  primePlacements:null,
  shellBound:false,
  shellResizeObserver:null,
  contextOverflowPopup:null,
  layoutResizePending:null,
  layoutResizeFrame:0,
  layoutResizeDispatching:false
};

const definitions=[];
const active=new Map();
const disabled=new Map();
const registries=new Map();
const projectSlices=new Map();
const cleanupByPlugin=new Map();
const eventListeners=new Map();
const externalPackages=new Map();
const overridePackages=new Map();
const overrideLoadErrors=[];
const externalLoadErrors=[];
const commandMenuPortals=new WeakMap();

module.exports=Object.freeze({
  state,
  definitions,
  active,
  disabled,
  registries,
  projectSlices,
  cleanupByPlugin,
  eventListeners,
  externalPackages,
  overridePackages,
  overrideLoadErrors,
  externalLoadErrors,
  commandMenuPortals
});
