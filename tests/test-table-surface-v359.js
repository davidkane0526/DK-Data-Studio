const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=read('src/core/ui-infrastructure.js');
const kernel=read('src/core/plugin-kernel.js');
const css=read('src/style.css');
const sdk=read('sdk/plugin-api.d.ts');
const automation=read('src/core/automation-test-runtime.js');

for(const token of ['class TableSurface','class TableSurfaceRegistry','globalTableSurfaceRegistry','table:not([data-dkds-table="off"])','setColumnWidth(index,width','autoSizeColumn(index','autoSizeAll()','sort(index,direction','setColumnVisible(index','showAllColumns()','visibleColumnKeys()','visibleTableText(','copyVisibleTable(','resetState(','menuItems(value,context)','headerMenuItems','cellMenuItems','hydrateAddedNode(node,spec={})','anonymousId(table)','hydrationId(table)','persistAnonymous','openHeaderMenu(event,th)','openCellMenu(event,cell)','restoreColumnState(value','mount(id,container,spec={})']){
  assert(ui.includes(token),`Unified TableSurface missing: ${token}`);
}
assert(ui.includes("this.tables={")&&ui.includes('globalTableSurfaceRegistry.mount')&&ui.includes('globalTableSurfaceRegistry.bind'),'plugin scopes must consume the Core-owned global TableSurface runtime.');
assert(!ui.includes('this.tableViewRegistry.observe(document'),'each plugin scope must not install a competing document-wide table observer.');
assert(ui.includes('for(const node of record.addedNodes||[])this.hydrateAddedNode(node,spec)'),'global dynamic-table observation must hydrate only added DOM branches instead of rescanning the whole document.');
assert(kernel.includes('tables: infrastructureScope?.tables || null'),'Plugin API must expose ctx.ui.tables.');
for(const token of ['DKDSTableSurface','DKDSTableRuntime','visibleColumnKeys():string[]','copyVisibleTable','resetState','tables:DKDSTableRuntime'])assert(sdk.includes(token),`SDK table contract missing: ${token}`);
for(const token of ['.dkds-managed-table','.dkds-table-column-resizer','[data-dkds-sort="asc"]','.dkds-table-column-hidden'])assert(css.includes(token),`TableSurface shared styling missing: ${token}`);
assert(automation.includes("'table.surface','Unified TableSurface interaction contract'")&&automation.includes('function tableSurfaceSmoke()'),'software automation must execute the real TableSurface interaction path.');
console.log('Unified TableSurface v3.59 checks passed.');
