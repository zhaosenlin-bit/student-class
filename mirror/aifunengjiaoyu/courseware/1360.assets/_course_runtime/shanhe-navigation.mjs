export const navigationKey='china-shanhe.navigation.v1';
export const createHostAdapter=()=>({reset(){},project:(_entry,values)=>values,navigate:async()=>''});
export function route(raw,page,_entry,config){
 if(typeof raw!=='string'||raw.length>1024)throw Error('SHANHE_NAVIGATION');
 const target=new URL(raw,page);
 if(target.origin!==page.origin||target.search||target.hash)throw Error('SHANHE_NAVIGATION');
 const found=config.entries.find(e=>new URL(e.path,new URL('../',import.meta.url)).pathname===target.pathname);
 if(!found)throw Error('SHANHE_NAVIGATION');return {id:found.id};
}
