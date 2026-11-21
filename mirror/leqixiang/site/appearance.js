// Classic head script sets the palette before first paint, including blocked storage.
(()=>{let theme='day';try{theme=sessionStorage.getItem('xiaobai-session-theme')==='night'?'night':'day';}catch{}document.documentElement.dataset.theme=theme;})();
document.addEventListener('DOMContentLoaded',()=>{
 const button=document.querySelector('#theme-toggle');
 if(!button)return;
 function sync(){const day=document.documentElement.dataset.theme==='day';button.setAttribute('aria-label',day?'切换为黑夜模式':'切换为白天模式');button.setAttribute('aria-pressed',String(day));button.innerHTML=day?'<span aria-hidden="true">☾</span><span>黑夜</span>':'<span aria-hidden="true">☼</span><span>白天</span>';}
 button.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='day'?'night':'day';document.documentElement.dataset.theme=theme;try{sessionStorage.setItem('xiaobai-session-theme',theme);}catch{}sync();window.dispatchEvent(new CustomEvent('site:theme',{detail:{theme}}));});sync();
});
