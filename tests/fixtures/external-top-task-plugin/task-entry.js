self.DKDSTaskDefinition={
  run(input,context){
    return {value:self.__dkdsFixtureImported(input?.value),imported:typeof self.__dkdsFixtureImported==='function',generation:context.generation};
  }
};
