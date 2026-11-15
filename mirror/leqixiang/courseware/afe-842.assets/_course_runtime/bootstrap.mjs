import {connectFrame} from './message-bridge.mjs';
import {createCoursePort} from './course-port.mjs';
import {applyControl} from './lifecycle.mjs';
import {createStatusNotice} from './status-notice.mjs';
const schedule=window.setTimeout.bind(window),cancel=window.clearTimeout.bind(window);
const root=new URL('../',import.meta.url),page=new URL(location.href);
const notice=createStatusNotice(document),report=notice.report;
let client,controller,config,entry,resolveReady,rejectReady;
const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});ready.catch(()=>{});

try{
 client=await connectFrame(window,{onStatus:report,
  onControl:async(command,context)=>{await ready;return applyControl(controller,client,command,context);},
  onSettings:async(_,context)=>{await ready;if(context.signal.aborted)throw Error('REVOKED');controller.syncSettings();}});
 // Register the handshake before the first asynchronous resource fetch. Otherwise
 // a fast iframe load can send its only challenge while no child listener exists.
 config=await (await fetch(new URL('./adapter.json',import.meta.url))).json();
 entry=config.entries.find(row=>new URL(row.path,root).pathname===page.pathname);
 if(!entry||entry.id!==client.binding.chapter)throw Error('ADAPTER_ENTRY');
 const navigation=await import(new URL(config.navigationModule,import.meta.url));
 const destination=raw=>{const intent=navigation.route(raw,page,entry,config);client.storage.setItem(navigation.navigationKey,JSON.stringify(intent));return intent.id;};
 const port=createCoursePort(client,{controller:()=>controller,resolveDestination:destination,returnDestination:config.courseReturn,report,schedule,cancel});
 const authored=await import(new URL(entry.controllerModule||config.authoredHostModule,import.meta.url));
 const authoredPort={...port,returnToMap:()=>port.navigate(new URL(config.entries.find(e=>e.id===config.courseReturn).path,root).href)};
 controller=await authored[entry.controllerExport||config.controllerExport](window,authoredPort,{entry,config,root,client,schedule,report});resolveReady();
 notice.setRetry(()=>port.retry());
 for(const script of entry.scripts){
  if(client.status()==='closed')throw Error('REVOKED');
  const url=new URL(script.path,page);
  if(script.module)await import(url.href);
  else await new Promise((resolve,reject)=>{const element=document.createElement('script');element.src=url.href;element.onload=resolve;element.onerror=()=>reject(Error('CLASSIC_SCRIPT_LOAD'));document.head.append(element);});
 }
 controller.afterScripts?.();
 report('scripts-loaded');
}catch(error){rejectReady(error);report(error.message);client?.close();}
