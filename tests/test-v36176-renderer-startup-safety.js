'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

assert.equal(json('package.json').version,'3.61.94');
const renderer=read('src/core/theme/material-renderer.js');

for(const token of [
  'const pendingRoleRoots=new Set()',
  'assignmentEnabled=false',
  'function enableAssignmentsAfterFirstPaint()',
  'requestFrame(()=>requestFrame(()=>{',
  'scheduleRoleAssignment(record.target)',
  'scheduleRoleAssignment(node)',
  "attributeFilter:['class'],attributeOldValue:true",
  'semanticClassSignature(record.oldValue)',
  "if(!hasClass(el,'dkds-optical-position-anchor')&&getComputedStyle(el).position==='static')addClass(el,'dkds-optical-position-anchor')"
]) assert(renderer.includes(token),`startup-safe Material Renderer missing ${token}`);

const observer=renderer.match(/const observer=new MutationObserver\(records=>\{[\s\S]*?observer\.observe\(document\.body,[\s\S]*?\);/)?.[0]||'';
assert(observer,'Material observer block missing.');
assert(!observer.includes('assignSemanticRole(record.target)'),'MutationObserver must not mutate role classes synchronously.');
assert(!observer.includes('assignSemanticRoles(node)'),'MutationObserver must not rescan added subtrees synchronously.');
assert(observer.includes('scheduleRoleAssignment(record.target)')&&observer.includes('scheduleRoleAssignment(node)'),'MutationObserver must queue changed targets/subtrees.');

const assign=renderer.match(/function assignSemanticRole\(el\)\{[\s\S]*?\n  \}\n  function assignSemanticRoles/)?.[0]||'';
assert(assign,'assignSemanticRole block missing.');
assert(assign.includes('addClass(el,`${ROLE_CLASS_PREFIX}${role}`)'),'role class writes must be idempotent.');
assert(assign.includes('removeClass(el,`${ROLE_CLASS_PREFIX}${previous}`)'),'role class removals must be idempotent.');
assert(!assign.includes("if(recipe==='liquid-glass'&&getComputedStyle(el).position==='static')addClass(el,'dkds-optical-position-anchor');else el.classList.remove"),'liquid optical anchor must not oscillate by removing the class it just used to establish positioning.');

const index=read('src/index.html');
for(const token of ['class="topbar dkds-material-role-chrome"','class="workspace"','id="statusBar"']) assert(index.includes(token),`static startup shell missing ${token}`);
console.log('v3.61.77 Material Renderer startup/first-paint safety contract passed.');
