'use strict';
const path=require('path');
module.exports=function readComposition(root,rel){
  const generatorPath=path.join(root,'scripts','generate-runtime-compositions.js');
  delete require.cache[require.resolve(generatorPath)];
  const {buildCompositionSource}=require(generatorPath);
  return buildCompositionSource(rel).source;
};
