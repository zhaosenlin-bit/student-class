// Existing basic-v1 bridge handles navigation and entitlements outside the course.
export function createShanheHost(win,port,{config,root}){
 const entries=new Set(config.entries.map(e=>new URL(e.path,root).pathname));
 const navigate=event=>{
  const link=event.target?.closest?.('a[href]');if(!link)return;
  const target=new URL(link.getAttribute('href'),win.location.href);
  if(target.origin!==new URL(win.location.href).origin||!entries.has(target.pathname))return;
  event.preventDefault();event.stopPropagation();void port.navigate(target.href);
 };
 win.document.addEventListener('click',navigate,true);
 return {checkpoint(){},pause(){},resume(){},syncSettings(){},dispose(){win.document.removeEventListener('click',navigate,true);delete win.__shanheLoadTerrain;}};
}
