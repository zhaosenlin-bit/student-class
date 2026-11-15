import {AudioManager} from './music-manager.js';
import {readMusicContext,resolveMusic,resolveAmbience} from './music-context.js';
import {AmbiencePlayer} from './ambience-player.js';
import './chapter-toolbar.js';

// Attached once by the common chapter toolbar (and by the two standalone episodes).
if(document.querySelector('#viewport')&&!window.frMusic){startMusic().catch(e=>console.warn('背景音乐暂不可用：',e.message));}
async function startMusic(){
 const response=await fetch(new URL('./config/music.json',import.meta.url),{cache:'no-store'});if(!response.ok)throw Error('音乐配置读取失败');const config=await response.json(),KEY=config.storageKey;
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}};
 let stored=read(),prefs={enabled:(stored.preferenceRevision||0)<(config.preferenceRevision||0)?config.defaults.enabled:stored.enabled!==false,volume:Number.isFinite(stored.volume)?Math.max(0,Math.min(1,stored.volume)):1,activated:stored.activated===true,ambienceEnabled:stored.ambienceEnabled!==false,preferenceRevision:config.preferenceRevision||0},context=null,first=true,resetting=false,lastSave=0;
 let control=null;
 const ambience=new AmbiencePlayer(),engine=new AudioManager(config,{onChange:()=>updateControls()});engine.setEnabled(prefs.enabled);engine.setUserVolume(prefs.volume);ambience.setEnabled(prefs.ambienceEnabled);
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./music.css',import.meta.url);document.head.append(style);
 control=document.createElement('details');control.id='music-control';control.dataset.ui='';control.dataset.i18nIgnore='';
 control.innerHTML='<summary aria-label="背景音乐设置">配乐</summary><div class="music-options"><label><input id="music-enabled" type="checkbox">播放背景音乐</label><label for="music-volume">配乐音量</label><input id="music-volume" aria-label="背景音乐音量" type="range" min="0" max="1" step="0.05"><label><input id="ambience-enabled" type="checkbox">播放环境声</label><small class="music-status" aria-live="polite"></small></div>';
 const summary=control.querySelector('summary'),toggle=control.querySelector('#music-enabled'),ambientToggle=control.querySelector('#ambience-enabled'),slider=control.querySelector('#music-volume'),status=control.querySelector('.music-status');
 const labels=[...control.querySelectorAll('label')].map(label=>({node:label.lastChild,source:label.lastChild.textContent}));
 const translations={'配乐：开':'Music: on','配乐：关':'Music: off','播放背景音乐':'Play background music','配乐音量':'Music volume','播放环境声':'Play ambience','背景音乐设置':'Music settings','背景音乐音量':'Music volume','声音未能加载，点击重试':'Audio unavailable. Click to retry.','声音随画面暂停':'Audio paused with the scene','已关闭背景音乐':'Background music is off','音乐连续播放':'Music is playing','点击页面后播放':'Click the page to start audio'};
 const localize=text=>window.appLanguage?.translateVisible?.(text)??(document.documentElement.lang==='en'?(translations[text]||text):text);
 const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
 const setLabel=(node,value)=>{if(node.getAttribute('aria-label')!==value)node.setAttribute('aria-label',value);};
 function mount(){const toolbar=document.querySelector('#toolbar'),parent=toolbar||document.querySelector('#viewport');control.classList.toggle('music-floating',!toolbar);if(parent&&control.parentElement!==parent)parent.append(control);control.classList.toggle('music-opens-up',!toolbar&&control.getBoundingClientRect().bottom>innerHeight-250);}
 function updateControls(){if(!control)return;toggle.checked=prefs.enabled;ambientToggle.checked=prefs.ambienceEnabled;slider.value=String(prefs.volume);setText(summary,localize(prefs.enabled?'配乐：开':'配乐：关'));setText(status,localize(engine.error||ambience.error?'声音未能加载，点击重试':(context?.musicPaused??context?.paused)?'声音随画面暂停':!prefs.enabled?'已关闭背景音乐':engine.context?.state==='running'?'音乐连续播放':'点击页面后播放'));for(const {node,source}of labels)setText(node,localize(source));setLabel(summary,localize('背景音乐设置'));setLabel(slider,localize('背景音乐音量'));}
 function write(savePosition=true){const current=read();current.revision=1;Object.assign(current,prefs);current.bookmarks||={};if(savePosition&&!resetting&&context&&engine.current){const bookmark={clipId:engine.current.id,offset:engine.position(),at:Date.now(),scope:context.scope};current.bookmarks[context.scope]=bookmark;current.last=bookmark;}try{localStorage.setItem(KEY,JSON.stringify(current));}catch{}stored=current;}
 toggle.addEventListener('change',()=>{prefs.enabled=toggle.checked;prefs.activated=true;engine.setEnabled(prefs.enabled);engine.unlock();write();updateControls();});
 ambientToggle.addEventListener('change',()=>{prefs.ambienceEnabled=ambientToggle.checked;ambience.setEnabled(prefs.ambienceEnabled);ambience.unlock();write();updateControls();});
 slider.addEventListener('input',()=>{prefs.volume=Number(slider.value);engine.setUserVolume(prefs.volume);write();});
 status.addEventListener('click',()=>{engine.unlock();ambience.unlock();});
 function initialOffset(cue,c){if(resetting)return 0;if(first){const local=stored.bookmarks?.[c.scope],last=stored.last;if(local?.clipId===cue.clipId)return local.offset;else if(last?.clipId===cue.clipId&&Date.now()-last.at<20000)return last.offset;}return cue.syncOnFirstStart?c.time:0;}
 function update(){
  mount();const next=readMusicContext();if(!next){updateControls();return;}context=next;const cue=resolveMusic(config,next);if(!cue)return;
  engine.setPaused(next.musicPaused??next.paused);engine.select(cue,initialOffset(cue,next));ambience.select(resolveAmbience(config,next),next.paused);if(engine.current)first=false;
  if(performance.now()-lastSave>2500){lastSave=performance.now();write();}updateControls();
 }
 function unlock(){if(!prefs.activated){prefs.activated=true;write(false);}engine.unlock();ambience.unlock();}
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',e=>{if(['Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))unlock();});
 // Confirmed reset controls are existing, reviewed selectors. Cancel leaves music untouched.
 document.addEventListener('click',e=>{if(!control.contains(e.target))control.open=false;if(!e.target.closest('#confirm-reset,#ui .confirm .primary,#confirm-panel .primary'))return;resetting=true;const current=read();if(context){delete current.bookmarks?.[context.scope];if(current.last?.scope===context.scope)delete current.last;}try{localStorage.setItem(KEY,JSON.stringify(current));}catch{}stored=current;first=true;engine.setPaused(true);ambience.select(null,true);setTimeout(()=>{update();engine.rewind();ambience.rewind();resetting=false;write();},350);},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)write();update();});
 window.addEventListener('pagehide',()=>{write();engine.setPaused(true);ambience.select(null,true);});window.addEventListener('pageshow',()=>update());
 window.addEventListener('storage',event=>{if(event.key!==KEY)return;const next=read();prefs.enabled=next.enabled!==false;prefs.volume=Number.isFinite(next.volume)?next.volume:1;prefs.ambienceEnabled=next.ambienceEnabled!==false;engine.setEnabled(prefs.enabled);engine.setUserVolume(prefs.volume);ambience.setEnabled(prefs.ambienceEnabled);updateControls();});
 document.addEventListener('app-languagechange',updateControls);document.addEventListener('app-localeready',updateControls);
 const timer=setInterval(update,125);
 window.frMusic=Object.freeze({inspect:()=>({...engine.inspect(),ambience:ambience.inspect(),contextInfo:context?{...context}:null,configuration:KEY}),config,refresh:()=>update(),dispose:()=>{clearInterval(timer);engine.dispose();ambience.dispose();control.dataset.disposed='true';control.remove();}});
 // Try the opening immediately when the browser allows it; the existing gesture
 // handlers resume it if a fresh browser session requires a click first.
 mount();update();engine.unlock();ambience.unlock();
}
