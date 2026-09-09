'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));


const renderer=read('src/core/theme/material-renderer.js');

for(const token of [
  'const pendingRoleRoots=new Set()',
  'assignmentEnabled=false',
  'function enableAssignmentsAfterFirstPaint()',
  "FrameScheduler.schedule('theme.material.enable'",
  'delayFrames:2',
  'scheduleRoleAssignment(target)',
  'scheduleRoleAssignment(node)',
  "attributeFilter:['class','data-dkds-material-context'],attributeOldValue:true",
  "record.attributeName==='class'",
  "materialClassSignature(record.oldValue)",
  "materialClassRelevant(record.oldValue)",
  "materialClassRelevant(nextClass)",
  "if(!hasClass(el,'dkds-optical-position-anchor')&&getComputedStyle(el).position==='static')addClass(el,'dkds-optical-position-anchor')"
]) assert(renderer.includes(token),`startup-safe Material Renderer missing ${token}`);

const observer=renderer.match(/hub\?\.subscribe\)hub\.subscribe\('core\.material-renderer',[\s\S]*?attributeOldValue:true\}\);/)?.[0]||'';
assert(observer,'Material Renderer shared Mutation Hub subscription missing.');
assert(!renderer.includes('new MutationObserver'),'Material Renderer must not create a second document-wide MutationObserver outside Core DOM Mutation Hub.');
assert(!renderer.includes('requestAnimationFrame'),'Material Renderer must not create a private RAF outside Core Frame Scheduler.');
assert(!observer.includes('assignSemanticRoles(node)'),'Mutation callback must not rescan added subtrees synchronously.');
assert(observer.includes('scheduleRoleAssignment(target)')&&observer.includes('scheduleRoleAssignment(node)'),'Mutation callback must queue changed targets/subtrees.');
assert(observer.includes("{root:document.body,subtree:true,childList:true,attributes:true,attributeFilter:['class','data-dkds-material-context'],attributeOldValue:true}"),'Material Renderer must declare its observation needs to the shared Mutation Hub rather than owning observer lifecycle.');

const assignStart=renderer.indexOf('function assignSemanticRole(el){');
const assignEnd=renderer.indexOf('function assignSemanticRoles(',assignStart);
const assign=assignStart>=0&&assignEnd>assignStart?renderer.slice(assignStart,assignEnd):'';
assert(assign,'assignSemanticRole block missing.');
assert(assign.includes('addClass(el,`${ROLE_CLASS_PREFIX}${role}`)'),'role class writes must be idempotent.');
assert(assign.includes('removeClass(el,`${ROLE_CLASS_PREFIX}${previous}`)'),'role class removals must be idempotent.');
assert(!assign.includes("if(recipe==='liquid-glass'&&getComputedStyle(el).position==='static')addClass(el,'dkds-optical-position-anchor');else el.classList.remove"),'liquid optical anchor must not oscillate by removing the class it just used to establish positioning.');

const index=read('src/index.html');
for(const token of ['class="topbar dkds-material-role-chrome"','class="project-tabs-bar"','id="statusBar"']) assert(index.includes(token),`static startup shell missing ${token}`);
console.log('v3.61.77 Material Renderer startup/first-paint safety contract passed.');
