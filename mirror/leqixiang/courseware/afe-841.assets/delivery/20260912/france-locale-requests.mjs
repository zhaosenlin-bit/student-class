// Candidate fetch selection only. This module neither checks nor grants entitlement.
const LANGUAGES=new Set(['zh','en','fr','es','de','it','pt']);
// Retry a transient transport failure once, never a denied/malformed catalog.
// A successful language switch still requires the complete scoped dictionary.
export async function fetchScopedLocale(url,fetcher=fetch){
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  let response;
  try{response=await fetcher(url,{signal:controller.signal});
   if(!response.ok){
    if(attempt===0&&(response.status===408||response.status===429||response.status>=500)){await response.body?.cancel();continue;}
    throw Error('Scoped translation unavailable');
   }
   return await response.json();
  }catch(error){
   if(attempt===0&&(error?.name==='TypeError'||error?.name==='AbortError'))continue;
   throw error;
  }finally{clearTimeout(timer);}
 }
}
export function localeRequests(page,locale){
 if(!LANGUAGES.has(locale))throw Error('UNSUPPORTED_LOCALE');
 const pathname=new URL(page).pathname;
 if(/[\\%]/.test(pathname))throw Error('UNSUPPORTED_PAGE');
 const match=pathname.match(/(?:^|\/)delivery\/20260912\/(index|chapter0[2-8](?:-entry)?)\.html$/);
 if(!match)throw Error('UNSUPPORTED_PAGE');
 const chapter=match[1]==='index'?1:Number(match[1].slice(8,9));
 return locale==='zh'?[]:['./locales/'+locale+'/chapter'+chapter+'.json'];
}
export async function loadLocaleForPage(page,locale,load){
 const result=Object.create(null);
 for(const relative of localeRequests(page,locale)){
  const group=await load(relative);
  if(!group||typeof group!=='object'||Array.isArray(group)||Object.keys(group).length>10000||
     Object.values(group).some(v=>typeof v!=='string'||!v.trim()))throw Error('INVALID_SCOPED_DICTIONARY');
  for(const [key,value]of Object.entries(group))result[key]=value;
 }
 return result;
}
