import {mapDestination} from './france-navigation.mjs';
export async function installAtlas(win,port,{config,root,client,schedule,report}){
 Object.defineProperty(win,'localStorage',{configurable:true,value:port.storage});
 await import(new URL('assets/map-music.js',root));
 await import(new URL('assets/index-Df_Pctd-.js',root));
 const deadline=Date.now()+45000;
 const map=await new Promise((resolve,reject)=>{function check(){if(client.status()==='closed')return reject(Error('REVOKED'));if(win.terrainMapB)return resolve(win.terrainMapB);if(Date.now()>=deadline)return reject(Error('MAP_START_TIMEOUT'));schedule(check,50);}check();});
 const music=win.frAtlasMusic;if(!music)throw Error('MAP_MUSIC_NOT_READY');
 let disposed=false;
 function checkpoint(){map.capture();if(map.store?.mode!=='persistent')throw Error('MAP_STORAGE_NOT_PERSISTENT');}
 map.host.enter=async target=>{try{const id=mapDestination(target),entry=config.entries.find(e=>e.id===id);await port.navigate(new URL(entry.path,root).href);return {status:'local-entry-requested'};}catch(error){report(error.message);return {status:'local-entry-denied'};}};
 port.ready();report('atlas-ready');
 return {checkpoint(){if(!disposed)checkpoint();},pause(){if(!disposed){map.pause();music.pause();}},resume(){if(!disposed){map.resume();music.resume();}},syncSettings(){},dispose(){if(disposed)return;checkpoint();map.dispose();music.dispose();disposed=true;}};
}
