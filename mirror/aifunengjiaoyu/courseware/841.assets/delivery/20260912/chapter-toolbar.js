// Shared presentation; chapter-owned buttons keep their original event handlers.
const toolbar=document.querySelector('#toolbar');
if(toolbar){
 const order=['directory','fullscreen','reset','music','language'];
 const selectors={directory:'[data-chapter-directory],a[href="chapters.html"],[data-action="directory"]',fullscreen:'#fullscreen,[data-action="fullscreen"]',reset:'#reset,[data-action="reset"]',music:'#music-control',language:'#language-toggle,[data-action="language"]'};
 let music=null;
 function sync(){
  observer.disconnect();
  const en=document.documentElement.lang==='en';
  const tr=(zh,english)=>window.appLanguage?.translateVisible?.(zh)??(en?english:zh);
  let directory=toolbar.querySelector(selectors.directory);
  if(!directory){directory=document.createElement('a');directory.href='chapters.html';directory.dataset.chapterDirectory='';toolbar.prepend(directory);}
  music=toolbar.querySelector('#music-control')||music;
  if(music?.dataset.disposed)music=null;
  if(music&&music.parentElement!==toolbar)toolbar.append(music);
  const controls=order.map(name=>{
   const control=toolbar.querySelector(selectors[name]);if(!control)return null;
   control.dataset.toolbarControl=name;
   if(name!=='music'&&name!=='language'){
    control.dataset.i18nIgnore='';
    const label=name==='directory'?tr('章节','Chapters'):name==='reset'?tr('重置此章','Reset chapter'):document.fullscreenElement?tr('退出全屏','Exit fullscreen'):tr('全屏','Fullscreen');
    if(control.textContent!==label)control.textContent=label;
   }
   if(name==='directory')control.setAttribute('aria-label',tr('打开章节目录','Open chapter menu'));
   return control;
  }).filter(Boolean);
  // Legacy nodes stay in the DOM for chapter scripts, but cannot appear or take focus.
  for(const child of toolbar.children){if(!controls.includes(child)){child.removeAttribute('data-toolbar-control');child.inert=true;child.setAttribute('aria-hidden','true');}}
  const current=[...toolbar.children].filter(c=>controls.includes(c));
  if(current.some((c,i)=>c!==controls[i]))for(const control of controls)toolbar.append(control);
  toolbar.dataset.unifiedToolbar='';toolbar.setAttribute('aria-label',tr('章节工具栏','Chapter controls'));
  observer.observe(toolbar,{childList:true,subtree:true,characterData:true});
 }
 const observer=new MutationObserver(records=>{
  if(records.some(r=>r.target===toolbar||r.target.parentElement?.closest('[data-toolbar-control="fullscreen"],[data-toolbar-control="reset"],[data-toolbar-control="directory"]')||r.target.matches?.('[data-toolbar-control="fullscreen"],[data-toolbar-control="reset"],[data-toolbar-control="directory"]')))sync();
 });
 const languageObserver=new MutationObserver(sync);
 languageObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 document.addEventListener('fullscreenchange',sync);
 document.addEventListener('app-languagechange',sync);document.addEventListener('app-localeready',sync);
 sync();
 // A save made with the old pause button must not strand a scene without a
 // visible resume control. Use the chapter handler so its clocks stay in sync.
 let resuming=false;
 function resumeLegacyPlayback(){
  const snapshot=(window.franceAct||window.chapterTwo||window.chapterThree||window.chapterAct||window.extras)?.inspect();
  if(!snapshot||snapshot.busy)return false;
  if(snapshot.execution)return true;
  if(document.hidden||document.querySelector('dialog[open],#ui .confirm'))return true;
  const paused=snapshot.paused||snapshot.progress?.paused||snapshot.state?.paused;
  const pause=toolbar.querySelector('#pause,[data-action="pause"]');
  if(paused&&pause&&!resuming){resuming=true;pause.click();resuming=false;}
  return true;
 }
 let attempts=0;
 function ready(){if(!resumeLegacyPlayback()&&++attempts<120)setTimeout(ready,250);}
 ready();
 document.addEventListener('click',resumeLegacyPlayback);
 // Chapters 1–3 already use this module. ES modules load it only once.
 if(!document.body.dataset.episode)import('./i18n.js');
}
