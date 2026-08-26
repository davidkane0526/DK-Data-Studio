'use strict';
const {ScientificCurveSurface}=require('./model');
const {applyScientificCurveNavigation}=require('./navigation');
const {applyScientificCurveRender}=require('./render');
applyScientificCurveNavigation(ScientificCurveSurface);
applyScientificCurveRender(ScientificCurveSurface);
module.exports=Object.freeze({ScientificCurveSurface});
