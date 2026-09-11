'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const manifest=json('src/plugins/aurora-pop-theme/plugin.json');
const aurora=read('src/plugins/aurora-pop-theme/plugin.js');
const tuple=v=>String(v).split('.').slice(0,3).map(Number);
const atLeast=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};

assert(atLeast(tuple(pkg.version),[3,66,5]),'Aurora light emerald refinement requires DK Data Studio 3.66.5+.');
assert.equal(manifest.version,'2.3.2','Aurora Pop manifest must advance to 2.3.2.');

// One Theme-owned palette controls the entire light secondary/active interaction axis.
for(const token of [
  "const LIGHT_EMERALD=Object.freeze({",
  "accent:'#16C995'",
  "fill:'#08A77A'",
  "fillHover:'#07996F'",
  "accentAlt:LIGHT_EMERALD.accent",
  "surfaceActive:LIGHT_EMERALD.softSurface",
  "secondary:{surface:LIGHT_EMERALD.fill,surfaceHover:LIGHT_EMERALD.fillHover,text:'#FFFFFF'",
  "active:{surface:LIGHT_EMERALD.softSurface,text:LIGHT_EMERALD.text",
  "edgeGlow:LIGHT_EMERALD.accent"
])assert(aurora.includes(token),`Aurora light emerald contract missing ${token}`);

assert(!aurora.includes("'#008B97'")&&!aurora.includes("'#00818C'"),'The reverted deep cyan-teal action fills must not return.');
assert(aurora.includes("seriesPalette:['#6F5CFF','#00B8C8'"),'Scientific series palette must remain unchanged by the UI interaction-color refinement.');

console.log('v3.66.5+ Aurora light emerald PASS: secondary stays filled, while light active toolbar actions use the accepted mint/teal state.');
