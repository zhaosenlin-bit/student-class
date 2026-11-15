// Each lesson carries its browsing origin, including across refreshes.
export function createCourseNavigation({location,history,getBundles,getScrollY,getViewState=()=>null,restoreViewState=()=>{},render}) {
  let pendingPosition=null;
  const position=value=>Number.isFinite(value)?Math.max(0,value):0;
  const contains=(href,id)=>{
    if(/^#(?:catalog|teachers|purchases|works|bundle)$/.test(href||''))return true;
    const match=/^#bundle\/([a-z0-9-]+)$/.exec(href||'');
    return !!match&&getBundles().some(b=>b.id===match[1]&&(b.productIds||[]).includes(id));
  };
  function origin(id) {
    if(contains(location.hash,id))return {href:location.hash,scrollY:position(getScrollY()),view:getViewState()};
    const entry=history.state?.courseNavigation;
    if(!['course','play','classroom'].some(page=>location.hash===`#${page}/${id}`)||entry?.courseId!==id||!contains(entry.href,id))return null;
    return {href:entry.href,scrollY:position(entry.scrollY),view:entry.view||null};
  }
  function navigate(page,id) {
    if(!['course','play','classroom'].includes(page)||!/^[a-z0-9-]+$/.test(id))return;
    const source=origin(id),href=`#${page}/${id}`;
    if(source&&source.href===location.hash)history.replaceState({...history.state,courseBrowse:source},'',location.hash);
    const state=source?{courseNavigation:{courseId:id,...source}}:{};
    // From a package, starting its course replaces the intervening intro so
    // the browser Back button also returns straight to the package directory.
    const replace=location.hash===href||(['play','classroom'].includes(page)&&location.hash===`#course/${id}`);
    history[replace?'replaceState':'pushState'](state,'',href);
    return render();
  }
  function target(id,player=false) {
    const source=origin(id);
    return source?{...source,label:source.href.startsWith('#bundle/')?'返回课件包目录':source.href==='#purchases'?'返回我的课件':'返回课件目录'}:{href:'#catalog',scrollY:0,view:null,label:'返回课件目录'};
  }
  function returnTo(id,player=false) {
    const back=target(id,player);
    pendingPosition=back;
    history.replaceState({courseBrowse:back},'',back.href);
    return render();
  }
  function restore(hash) {
    const saved=pendingPosition||history.state?.courseBrowse;
    if(saved?.href===hash)restoreViewState(saved.view);
  }
  function takePosition(hash) {
    const saved=pendingPosition||history.state?.courseBrowse;pendingPosition=null;
    return saved?.href===hash?saved.scrollY:0;
  }
  return {navigate,target,returnTo,restore,takePosition};
}
