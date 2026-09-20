'use strict';

const UNIT_CHROME_POLICIES=Object.freeze({
  plotViewComplete:Object.freeze({
    unit:'plotView',variant:'complete',header:'required',title:'required',
    coreActions:Object.freeze(['placement','export']),
    logicalOrder:Object.freeze(['placement','export','domain-actions']),
    domainActions:'optional-after-export',
    invariants:Object.freeze([
      'header is always present',
      'placement control is always present because a PlotView is movable',
      'export menu is always present and contains at least one export/copy action',
      'plugin actions may extend but may not replace Core placement/export actions'
    ])
  }),
  plotGroupStandard:Object.freeze({
    unit:'plotGroup',header:'standard',title:'required',meta:'optional',
    coreActions:Object.freeze(['placement','columns','collapse','close']),
    logicalOrder:Object.freeze(['placement','columns','domain-actions','collapse','close']),
    domainActions:'optional-between-columns-and-collapse',
    invariants:Object.freeze([
      'standard group header is complete; partial group chrome is forbidden',
      'columns control is Core-owned',
      'placement/collapse/close are Core-owned',
      'every child is a complete PlotView'
    ])
  }),
  plotGroupTitleless:Object.freeze({
    unit:'plotGroup',header:'none',title:'forbidden',coreActions:Object.freeze([]),
    logicalOrder:Object.freeze([]),domainActions:'forbidden',
    invariants:Object.freeze([
      'titleless group is fixed to exactly one placement',
      'titleless group exposes no placement/collapse/close chrome'
    ])
  }),
  movableInspector:Object.freeze({
    unit:'prime',role:'inspector',header:'required',title:'required',
    coreActions:Object.freeze(['placement','close']),
    optionalCoreActions:Object.freeze(['collapse']),
    logicalOrder:Object.freeze(['placement','domain-actions','collapse?','close']),
    invariants:Object.freeze(['movable inspector uses canonical header','close is always discoverable'])
  }),
  movableDataControl:Object.freeze({
    unit:'prime',role:'data-control',header:'required',title:'required',
    coreActions:Object.freeze(['placement','close']),
    optionalCoreActions:Object.freeze(['collapse']),
    logicalOrder:Object.freeze(['placement','domain-actions','collapse?','close']),
    invariants:Object.freeze(['movable data-control uses canonical header'])
  }),
  fixedDataControl:Object.freeze({
    unit:'prime',role:'data-control',header:'optional',coreActions:Object.freeze([]),
    logicalOrder:Object.freeze([]),
    invariants:Object.freeze(['single-placement fixed data-control never exposes a placement chooser'])
  }),
  scientificSecondary:Object.freeze({
    unit:'prime',role:'scientific-secondary',header:'required',title:'required',
    coreActions:Object.freeze(['placement','collapse','close']),
    logicalOrder:Object.freeze(['placement','domain-actions','collapse','close']),
    invariants:Object.freeze(['scientific-secondary canonical header is complete'])
  }),
  portable:Object.freeze({
    unit:'portable',header:'required-when-chrome',
    coreActions:Object.freeze(['placement']),
    optionalCoreActions:Object.freeze(['collapse','close']),
    invariants:Object.freeze(['placement is injected only when more than one placement is available','drag/resize/placement have one Core owner'])
  })
});

const STRUCTURAL_PRIMITIVE_POLICIES=Object.freeze({
  button:Object.freeze({unit:'action',factory:'action.create',rule:'Every ordinary interactive button is expressible as an Action Unit or as a mandatory Core chrome action.'}),
  input:Object.freeze({unit:'field',factory:'field.create',rule:'Text/number/range inputs use Field; checkbox/radio inputs use Check.'}),
  select:Object.freeze({unit:'field',factory:'field.create',rule:'Select controls use Field/select or schema ParameterForm.'}),
  textarea:Object.freeze({unit:'field',factory:'field.create',rule:'Textarea controls use Field/textarea.'}),
  checkbox:Object.freeze({unit:'check',factory:'check.create',rule:'Checkbox/radio geometry and alignment are Core-owned.'}),
  table:Object.freeze({unit:'table',factory:'table.mount',rule:'Data tables use the managed Table Unit.'}),
  header:Object.freeze({unit:'header',factory:'header.create',rule:'Panel/section/portable headers use Header unless a stronger Unit creates its header.'}),
  surface:Object.freeze({unit:'surface',factory:'surface.create',rule:'Canonical material surfaces use Surface/Panel.'}),
  plot:Object.freeze({unit:'scientificPlot',factory:'scientificPlot.create',rule:'Chrome-free plot canvas is ScientificPlot; complete data figure is PlotView.'}),
  status:Object.freeze({unit:'status',factory:'status.create/status.contribute',rule:'Local/global status presentation uses Status.'})
});

module.exports=Object.freeze({UNIT_CHROME_POLICIES,STRUCTURAL_PRIMITIVE_POLICIES});
