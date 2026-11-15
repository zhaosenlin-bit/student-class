import {mountMagneticButton} from './brand-flare/magnetic.js?v=1';
const home=document.querySelector('#brand-home'),stage=document.querySelector('#flare-stage');
const magnetic=mountMagneticButton(document.querySelector('#catalog-entry'));
const settingsButton=document.querySelector('#scene-settings-button'),settings=document.querySelector('#scene-settings');
let scenePromise;
function closeSettings(){settings.hidden=true;settingsButton.setAttribute('aria-expanded','false');}
function fallback(){
 document.body.classList.add('flare-basic');stage.dataset.ready='basic';stage.dataset.renderState='static';
 for(const id of ['scene-quality','scene-paused']){const control=document.getElementById(id);if(control)control.disabled=true;}
 const fps=document.querySelector('#scene-fps');if(fps)fps.textContent='静态光影';
}
settingsButton.addEventListener('click',()=>{const open=settings.hidden;settings.hidden=!open;settingsButton.setAttribute('aria-expanded',String(open));});
document.addEventListener('pointerdown',e=>{if(!settings.hidden&&!settings.contains(e.target)&&!settingsButton.contains(e.target))closeSettings();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!settings.hidden){closeSettings();settingsButton.focus();}});
document.querySelector('#scene-reset').addEventListener('click',()=>{magnetic.reset();window.dispatchEvent(new Event('brandflare:reset'));});
window.addEventListener('brandflare:unavailable',fallback);
export function showHome(show){
 home.hidden=!show;document.body.classList.toggle('is-home',show);magnetic.setActive(show);
 if(!show)closeSettings();
 window.dispatchEvent(new CustomEvent('brandflare:visibility',{detail:{active:show}}));
 if(!show||scenePromise)return;
 const basic=!navigator.gpu||matchMedia('(prefers-reduced-motion: reduce)').matches||new URLSearchParams(location.search).get('graphics')==='basic';
 scenePromise=basic?Promise.resolve().then(fallback):import('/brand-flare/scene.js?v=1').catch(fallback);
}
