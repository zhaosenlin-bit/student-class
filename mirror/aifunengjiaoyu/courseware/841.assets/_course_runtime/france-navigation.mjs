// Content-side URL grammar. These intents are never asset grants or progress proof.
export const navigationKey='course.navigation.v1';
export const mapKey='fr1789:terrain-b:state:v1';
const episodes=new Set(['ex-valmy','ex-marseille']);
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const fail=()=>{throw Error('RETURN_CONTEXT_DENIED');};
function params(query,allowed){const p=new URLSearchParams(query),keys=[...p.keys()];if(query.length>512||keys.length!==new Set(keys).size||keys.some(k=>!allowed.includes(k)))fail();return p;}
export function validateQuery(from,to,query){
 if(!query)return '';
 if(from==='chapter-4'&&episodes.has(to)){
  const p=params(query,['returnTo','returnContext']);if(p.size!==2||p.get('returnTo')!=='chapter04.html'||!uuid(p.get('returnContext')))fail();return '?'+p;
 }
 if(episodes.has(from)&&to==='chapter-4'){
  const p=params(query,['extrasEpisode','extrasStatus','extrasContext','extrasMenu']);
  if(p.get('extrasEpisode')!==from||!['completed','exited'].includes(p.get('extrasStatus'))||(p.has('extrasContext')&&!uuid(p.get('extrasContext')))||(p.has('extrasMenu')&&(from!=='ex-valmy'||p.get('extrasMenu')!=='1')))fail();return '?'+p;
 }
 fail();
}
export function route(raw,page,entry,config){
 const base=new URL(page),url=new URL(raw,base);if(url.origin!==base.origin||url.hash)fail();
 const suffix=entry.path;if(!base.pathname.endsWith('/'+suffix))fail();
 const prefix=base.pathname.slice(0,-suffix.length);
 if(url.pathname===prefix+config.directoryPath&&!url.search)return {id:config.courseReturn,query:''};
 const target=config.entries.find(row=>[row.path,...(row.aliases||[])].some(p=>url.pathname===prefix+p));if(!target)fail();
 return {id:target.id,query:validateQuery(entry.id,target.id,url.search)};
}
export function mapDestination(target){
 if(!target||Object.getPrototypeOf(target)!==Object.prototype||Object.keys(target).sort().join(',')!=='action,contentId,kind'||target.kind!=='chapter'||!['start','continue'].includes(target.action))throw Error('MAP_ACTION_REVIEW_REQUIRED');
 if(episodes.has(target.contentId))return target.contentId;
 const m=/^delivery-ch0([1-8])$/.exec(target.contentId);if(!m)throw Error('MAP_ENTRY_DENIED');return 'chapter-'+m[1];
}
export function createHostAdapter(config){
 let lease=null,language=null;
 const languages=new Set(['zh','en','fr','es','de','it','pt']);
 const byId=id=>config.entries.find(e=>e.id===id)||fail();
 const progress=(id,values)=>{const key=byId(id).keys[0];try{return JSON.parse(values[key]||'null');}catch{return null;}};
 return {
  reset(){lease=null;language=null;},
  async project(entry,values,read){
   const next={...values};delete next[navigationKey];
   if(entry.id==='atlas'){
    let state;try{state=JSON.parse(next[mapKey]);}catch{}
    state??={apiVersion:'fr1789-state/1',settings:{language:'zh',volume:.5,muted:true},map:null};
    const summaries={};for(const row of config.entries.filter(e=>e.id!=='atlas')){
     const v=await read(row.id),started=row.keys.filter(k=>!['frenchRevolution.language','fr1789.extras.language','frenchRevolution.music.v1',navigationKey].includes(k)).some(k=>!!v[k]);
     summaries[row.id.startsWith('chapter-')?'delivery-ch0'+row.id.slice(8):row.id]={delivery20260912:{version:1,started}};
    }
    if(language)state.settings.language=language;
    state.chapterProgress=summaries;next[mapKey]=JSON.stringify(state);
   }
   if(language)for(const key of ['frenchRevolution.language','fr1789.extras.language'])if(entry.keys.includes(key))next[key]=language==='zh'&&key==='fr1789.extras.language'?'zh-CN':language;
   if(entry.id==='chapter-4')for(const id of episodes){const p=progress(id,await read(id));next['fr1789.extras.'+id+'.v1']=JSON.stringify({revision:2,completed:p?.revision===2&&p.completed===true});}
   return next;
  },
  async navigate(from,target,read){
   const values=await read(from),raw=values[navigationKey];let intent;
   try{intent=JSON.parse(raw);}catch{}
   if(!intent||Object.keys(intent).sort().join(',')!=='id,query'||intent.id!==target.id||typeof intent.query!=='string')fail();
   const query=validateQuery(from,target.id,intent.query);
   if(episodes.has(from)&&target.id==='chapter-4'&&lease&&!query)fail();
   let selected=values['frenchRevolution.language']||values['fr1789.extras.language'];
   if(from==='atlas'){try{selected=JSON.parse(values[mapKey]).settings.language;}catch{fail();}}
   if(selected==='zh-CN')selected='zh';if(selected&&!languages.has(selected))fail();

   if(from==='chapter-4'&&episodes.has(target.id)&&query){
    const token=new URLSearchParams(query).get('returnContext'),p=progress(from,values);
    if(p?.returnContext?.token!==token)fail();lease={episode:target.id,token};
   }else if(episodes.has(from)&&target.id==='chapter-4'&&query){
    const p=new URLSearchParams(query),token=p.get('extrasContext'),episode=progress(from,values);
    if(p.get('extrasStatus')!==(episode?.completed===true?'completed':'exited'))fail();
    if(token){const parent=progress('chapter-4',await read('chapter-4'));if(lease?.episode!==from||lease.token!==token||parent?.returnContext?.token!==token)fail();}
    else if(lease)fail();
    lease=null;
   }else lease=null;
   language=selected||null;return query;
  }
 };
}
