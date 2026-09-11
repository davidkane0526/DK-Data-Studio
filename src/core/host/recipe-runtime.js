(() => {
  if(window.DKDSHostRecipes)return;
  const VERSION='1.0.0';
  const recipes=new Map();
  function register(id,activate){const key=String(id||'').trim();if(!key||typeof activate!=='function')throw new Error('Host recipe requires id and activation function.');if(recipes.has(key))throw new Error(`Duplicate host recipe: ${key}`);recipes.set(key,activate);return activate;}
  async function use(id,ctx,options={}){const fn=recipes.get(String(id||''));if(!fn)throw new Error(`Host recipe not found: ${id}`);return await fn(ctx,options);}
  window.DKDSHostRecipes=Object.freeze({VERSION,register,use,list:()=>[...recipes.keys()]});
})();
