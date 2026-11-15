// Navigation stays available even when the optional graphics cannot start.
(function(){
 'use strict';
 var button=document.getElementById('mobile-menu'),header=document.querySelector('.site-header'),nav=document.getElementById('site-navigation');
 function close(){if(!button)return;header.classList.remove('menu-open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','打开导航菜单');}
 if(button){button.addEventListener('click',function(){var open=button.getAttribute('aria-expanded')!=='true';header.classList.toggle('menu-open',open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'关闭导航菜单':'打开导航菜单');});
 nav.addEventListener('click',function(e){if(e.target.closest('a'))close();});
 document.addEventListener('pointerdown',function(e){if(!header.contains(e.target))close();});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'){close();}});window.addEventListener('hashchange',close);}
 // Safari before 15.4 has no dialog.showModal. Keep authentication usable.
 document.querySelectorAll('dialog').forEach(function(dialog){if(dialog.showModal)return;
  dialog.showModal=function(){this.setAttribute('open','');this.classList.add('dialog-fallback');};
  dialog.close=function(){this.removeAttribute('open');this.classList.remove('dialog-fallback');};
 });
 function viewport(){var vv=window.visualViewport;document.documentElement.style.setProperty('--visible-height',(vv?vv.height:window.innerHeight)+'px');}
 viewport();window.addEventListener('resize',viewport,{passive:true});
 if(window.visualViewport)window.visualViewport.addEventListener('resize',viewport,{passive:true});
})();
