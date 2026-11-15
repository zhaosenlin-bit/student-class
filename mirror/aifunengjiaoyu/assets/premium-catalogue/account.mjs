const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v));
export async function mountAccount(root,{token,onBrowse,onSummary}={}){
 root.className='pc-account';root.textContent='正在读取精品会员权益…';
 try{
  const r=await fetch('/api/premium/account',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!r.ok)throw Error();const data=await r.json();if(!root.isConnected)return;
  onSummary?.(data.memberships.some(m=>m.status==='active'));
  root.innerHTML=`<header><h3>我的精品课会员</h3><button class="btn btn-outline btn-sm" data-browse>进入精品课</button></header>${data.administrator?'<p>管理员可直接使用全部精品课，无需购买；下方独立显示已购套餐权益。</p>':''}${data.memberships.length?`<div class="pc-member-grid">${data.memberships.map(m=>`<article><strong>${esc(m.name)}</strong><span class="pc-member-state">${({active:'精品课会员 · 有效',scheduled:'待生效',expired:'已到期',revoked:'权益已撤销'})[m.status]}</span>${m.startsAt?`<small>${m.status==='scheduled'?'生效':'开始'}：${esc(date(m.startsAt))}<br>到期：${esc(date(m.endsAt))}（北京时间）</small>`:''}${m.upcoming?`<small>后续期限：${esc(date(m.upcoming.startsAt))} 至 ${esc(date(m.upcoming.endsAt))}</small>`:''}</article>`).join('')}</div>`:'<p>暂无精品套餐会员，可先前往免费体验课试用。</p>'}<small>精品套餐与课件广场 VIP 分别记录，原单购课件权益继续保留。</small>`;
  root.querySelector('[data-browse]').onclick=()=>onBrowse?.();
 }catch{if(root.isConnected){root.innerHTML='<p>精品会员信息暂时未能读取，请稍后重试。</p><button class="btn btn-outline btn-sm">重新读取</button>';root.querySelector('button').onclick=()=>mountAccount(root,{token,onBrowse,onSummary});}}
}
