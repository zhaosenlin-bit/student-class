import {AudioManager} from '../delivery/20260912/music-manager.js';

const key='fr1789.terrain.music.v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(key))||{};}catch{}
// Migrate the former off switch to zero volume, so the slider can always restore sound.
const prefs={volume:saved.enabled===false?0:Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.5};
const engine=new AudioManager({defaults:{outputGainDb:0},clips:{atlas:{asset:'delivery/20260912/audio/source/silent-distance.mp3',loopCrossfade:1.6}}});
engine.setUserVolume(prefs.volume);engine.setEnabled(true);
let control,active=false,retire=0,reviewPaused=false;
function save(){try{localStorage.setItem(key,JSON.stringify(prefs));}catch{}}
function mount(){
 const toolbar=document.querySelector('.top-tools');if(!toolbar||control)return;
 control=document.createElement('div');control.className='map-music';
 control.innerHTML='<svg class="map-music-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4Z"/><g class="map-music-waves"><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></g><path class="map-music-cross" d="m16 9 6 6m0-6-6 6"/></svg><input id="map-music-volume" type="range" min="0" max="1" step="0.05" aria-label="地图背景音乐音量" title="地图背景音乐音量">';
 toolbar.prepend(control);
 const slider=control.querySelector('input');slider.value=prefs.volume;
 slider.oninput=()=>{prefs.volume=Number(slider.value);engine.setUserVolume(prefs.volume);engine.unlock();save();updateLabels();};
 updateLabels();
}
function updateLabels(){if(!control)return;control.dataset.muted=String(prefs.volume===0);const english=document.documentElement.lang==='en'||window.terrainMapB?.state().language==='en',label=english?'Map music volume':'地图背景音乐音量',slider=control.querySelector('input');slider.setAttribute('aria-label',label);slider.title=label;}
function sync(){
 mount();updateLabels();
 const show=!!control&&!document.querySelector('#app')?.classList.contains('host-active');
 if(control)control.hidden=!show;
 const next=show&&!document.hidden&&!reviewPaused;
 if(next===active)return;active=next;clearTimeout(retire);
 if(next){engine.setPaused(false);engine.select({clipId:'atlas',volume:.48,loop:true,fadeIn:1.5,fadeOut:.4});engine.unlock();}
 else if(document.hidden||reviewPaused){engine.setPaused(true);}
 else{engine.select({clipId:'atlas',volume:0,loop:true,fadeIn:1.5,fadeOut:.35});retire=setTimeout(()=>{if(!active)engine.setPaused(true);},400);}
}
const unlock=()=>{if(active)engine.unlock();};
document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
document.addEventListener('visibilitychange',sync);window.addEventListener('pageshow',sync);
window.addEventListener('pagehide',()=>{clearTimeout(retire);active=false;engine.setPaused(true);});
const timer=setInterval(sync,200);sync();
window.frAtlasMusic={pause:()=>{reviewPaused=true;sync();},resume:()=>{reviewPaused=false;sync();},inspect:()=>({...engine.inspect(),active}),dispose:()=>{clearInterval(timer);clearTimeout(retire);engine.dispose();control?.remove();}};
