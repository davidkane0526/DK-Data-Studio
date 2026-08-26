

  class GridController {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.columns=Math.max(1,Number(spec.columns)||3);this.minItemWidth=Math.max(180,Number(spec.minItemWidth)||320);this.maxColumns=Math.max(this.columns,Number(spec.maxColumns)||6);this.ro=null;this.appliedColumns=0;
      if(!this.container)throw new Error('GridController container not found.');
      this.container.classList.add('dkds-managed-grid');this.container.__dkdsGridController=this;
      this.apply();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.apply());this.ro.observe(this.container);}
    }
    responsiveColumns(){
      if(this.spec.responsive===false)return this.columns;
      const width=Math.max(0,this.container.clientWidth||0);
      if(!width)return this.columns;
      return Math.max(1,Math.min(this.columns,this.maxColumns,Math.floor((width+10)/(this.minItemWidth+10))||1));
    }
    applyStickyAvoidance(cols){
      const children=[...this.container.children].filter(node=>node?.nodeType===1);
      for(const child of children){if(child.dataset?.dkdsGridAvoidance==='1'){child.style.removeProperty('grid-column');child.style.removeProperty('grid-row');delete child.dataset.dkdsGridAvoidance;}}
      this.container.classList.remove('dkds-grid-sticky-avoidance','dkds-grid-sticky-disabled');
      const sticky=children.filter(child=>child.classList?.contains('is-sticky'));
      if(!sticky.length)return;
      if(cols<2){this.container.classList.add('dkds-grid-sticky-disabled');return;}
      // Reserve one grid column for the first sticky view. All sibling plots are
      // deterministically packed into the remaining cells, so pinning one plot
      // never visually covers another plot on desktop or mobile.
      const anchor=sticky[0],anchorIndex=Math.max(0,children.indexOf(anchor)),anchorCol=Math.min(cols,(anchorIndex%cols)+1),available=[];
      for(let col=1;col<=cols;col++)if(col!==anchorCol)available.push(col);
      const others=children.filter(child=>child!==anchor);let row=1,index=0;
      for(const child of others){const col=available[index%available.length];row=Math.floor(index/available.length)+1;child.style.setProperty('grid-column',String(col));child.style.setProperty('grid-row',String(row));child.dataset.dkdsGridAvoidance='1';index++;}
      const rows=Math.max(1,Math.ceil(others.length/available.length));anchor.style.setProperty('grid-column',String(anchorCol));anchor.style.setProperty('grid-row',`1 / span ${rows}`);anchor.dataset.dkdsGridAvoidance='1';this.container.classList.add('dkds-grid-sticky-avoidance');
    }
    apply(){const cols=this.responsiveColumns();const changed=cols!==this.appliedColumns;this.appliedColumns=cols;this.container.style.setProperty('--dkds-grid-columns',String(cols));this.container.dataset.dkdsGridColumns=String(cols);this.applyStickyAvoidance(cols);if(changed)this.scope.emitResize?.({reason:'grid',columns:cols});else this.scope.requestChartResize?.({reason:'grid-observer',columns:cols});return cols;}
    setColumns(value){this.columns=Math.max(1,Math.min(this.maxColumns,Number(value)||1));this.apply();return this.columns;}
    getColumns(){return this.columns;}
    dispose(){this.ro?.disconnect?.();if(this.container.__dkdsGridController===this)delete this.container.__dkdsGridController;for(const child of this.container.children){if(child.dataset?.dkdsGridAvoidance==='1'){child.style.removeProperty('grid-column');child.style.removeProperty('grid-row');delete child.dataset.dkdsGridAvoidance;}}this.container.classList.remove('dkds-managed-grid','dkds-grid-sticky-avoidance','dkds-grid-sticky-disabled');this.container.style.removeProperty('--dkds-grid-columns');delete this.container.dataset.dkdsGridColumns;}
  }
