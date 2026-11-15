let epoch=Date.now(),anchor=typeof performance==='object'?performance.now():0;
export const promotionNow=()=>epoch+(typeof performance==='object'?performance.now()-anchor:0);
export function syncPromotionClock(serverTime){if(Number.isFinite(serverTime)){epoch=serverTime;anchor=performance.now();}}
export function countdownParts(remaining){
 const t=Math.max(0,Math.floor(remaining)),pad=(n,len=2)=>String(n).padStart(len,'0');
 return {days:Math.floor(t/86400000),hours:pad(Math.floor(t/3600000)%24),minutes:pad(Math.floor(t/60000)%60),seconds:pad(Math.floor(t/1000)%60),milliseconds:pad(t%1000,3),ended:t===0};
}
export function countdownMarkup(endsAt){
 if(!Number.isSafeInteger(endsAt)||endsAt<=0)return '';
 const p=countdownParts(endsAt-promotionNow());
 return `<span class="promotion-countdown" data-promotion-countdown="${endsAt}" title="北京时间 2026 年 10 月 20 日 23:59:59 截止" role="timer" aria-label="限时优惠倒计时"><span class="countdown-label">${p.ended?'优惠已结束':'优惠剩余'}</span><span class="countdown-digits" aria-hidden="true"><b data-time="days">${p.days}</b><small>天</small><b data-time="hours">${p.hours}</b><i>:</i><b data-time="minutes">${p.minutes}</b><i>:</i><b data-time="seconds">${p.seconds}</b><i>.</i><b class="countdown-ms" data-time="milliseconds">${p.milliseconds}</b></span></span>`;
}
export function startPromotionCountdowns({onExpire=()=>{}}={}){
 const entries=new Map();let frame=0,expiredNotified=false;
 const visible=new IntersectionObserver(changes=>{for(const c of changes){const e=entries.get(c.target);if(e)e.visible=c.isIntersecting;}schedule();});
 function schedule(){if(!frame&&!document.hidden&&[...entries.values()].some(e=>e.visible&&!e.ended))frame=requestAnimationFrame(tick);}
 function tick(){
  frame=0;if(document.hidden)return;const now=promotionNow();
  for(const [node,e]of entries){
   if(!node.isConnected){visible.unobserve(node);entries.delete(node);continue;}
   if(!e.visible||e.ended)continue;
   const p=countdownParts(e.end-now);
   for(const [key,element]of Object.entries(e.parts)){const value=String(p[key]);if(element.textContent!==value)element.textContent=value;}
   // Screen readers receive a stable label rather than 60 announcements/sec.
   if(p.ended){e.ended=true;node.classList.add('is-ended');node.querySelector('.countdown-label').textContent='优惠已结束';node.setAttribute('aria-label','限时优惠已结束');if(!expiredNotified){expiredNotified=true;Promise.resolve(onExpire()).catch(()=>{});}}
  }
  schedule();
 }
 function scan(){
  for(const node of document.querySelectorAll('[data-promotion-countdown]'))if(!entries.has(node)){
   entries.set(node,{end:Number(node.dataset.promotionCountdown),visible:false,ended:false,parts:Object.fromEntries([...node.querySelectorAll('[data-time]')].map(p=>[p.dataset.time,p]))});visible.observe(node);
  }
  for(const node of entries.keys())if(!node.isConnected){visible.unobserve(node);entries.delete(node);}
  schedule();
 }
 const mutation=new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('[data-promotion-countdown]')))scan();});
 mutation.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;if(!document.hidden)scan();});
 scan();return {scan};
}
