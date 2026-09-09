'use strict';
const $=selector=>document.querySelector(selector);
const mainSvg=d3.select('#mainPlot');
const status=$('#statusBarMessage')||$('#statusBar');


const state={
  artifactStore:window.DKDSData.createStore(),
  projectPath:null,
  mainLayout:{raf:null,lastWidth:0,lastHeight:0,renderToken:0},
  mainView:{xDomain:null,yDomain:null,mode:'select'},
  projectTabs:[],
  activeProjectTabId:null,
  projectTabSeq:0,
  importDraft:{files:[],activePath:null,loading:false,fileDialogOpen:false,targets:null,scope:null,selectionAnchorPath:null,columnFieldFilter:''},
  lanWebStatusState:null,
  lanWebSelectedBaseUrl:''
};

module.exports=Object.freeze({$,mainSvg,status,state});
