const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(n/100).toFixed(2).replace(/\.00$/,'');
export async function showPlanPurchase(planId,{token,onLogin,onPaid,onVipCheckout,context='',vipOnly=false,successLabel='返回精品课'}={}){
 document.querySelector('#premium-purchase-dialog')?.close();
 const previous=document.activeElement,dialog=document.createElement('dialog');dialog.id='premium-purchase-dialog';dialog.className='pc-purchase-dialog';
 dialog.innerHTML='<p role="status">正在读取套餐…</p>';document.body.append(dialog);dialog.showModal();
 let active=true,timer=null,busy=false,pending=null,plan,settings,finished=false;
 function dispose(){active=false;clearTimeout(timer);dialog.remove();previous?.focus();}
 dialog.addEventListener('close',dispose);dialog.addEventListener('cancel',dispose);
 async function api(url,body){const r=await fetch(url,{method:body?'POST':'GET',cache:'no-store',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok||data.success===false)throw Error(data.msg||'服务暂时不可用，请稍后重试。');return data;}
 function status(text){const el=dialog.querySelector('[data-status]');if(el)el.textContent=text;}
 async function paid(){
  if(finished||!active)return;finished=true;clearTimeout(timer);
  dialog.innerHTML=`<section class="pc-payment-success" role="status"><div class="pc-success-mark" aria-hidden="true">✓</div><h2>支付成功</h2><p>${esc(plan.name)} · ¥${money(plan.effectiveCents)}</p><p data-status>付款已确认，正在刷新使用权益…</p><button class="pc-primary" data-done disabled>正在更新权益</button></section>`;
  const done=dialog.querySelector('[data-done]');
  let updated=false;
  try{await onPaid?.();updated=true;}catch{}
  if(!active)return;
  status(updated?'会员权益已开通，即将返回。您也可在个人中心查看套餐和到期时间。':'付款已确认，请刷新页面查看权益，勿重复购买。');
  done.disabled=false;done.textContent=updated?successLabel:'关闭';done.onclick=()=>dialog.close();
  if(updated)timer=setTimeout(()=>{if(active)dialog.close();},1800);
 }
 async function poll(trade){
  if(!active||finished)return;
  try{
   const d=await api('/api/pay/query?out_trade_no='+encodeURIComponent(trade));if(!active)return;
   if(d.status==='paid'){await paid();return;}
   if(d.status!=='pending'){finished=true;dialog.querySelector('[data-qr]').replaceChildren();const b=dialog.querySelector('[data-pay]');b.disabled=true;b.textContent='订单已处理';status('请到订单记录查看状态。');return;}
  }catch{status('暂未取得支付结果，请稍后查看订单，勿重复付款。');}
  if(active&&!finished)timer=setTimeout(()=>poll(trade),2500);
 }
 function draw(){
  const canPay=plan.kind==='vip'?settings.vipCheckoutEnabled===true:settings.checkoutEnabled===true;
  dialog.innerHTML=`<header><div><p class="pc-eyebrow">会员服务</p><h2>${esc(plan.name)}</h2></div><button data-close aria-label="关闭购买说明">×</button></header>${context?`<p>${esc(context)}</p>`:''}<p class="pc-purchase-amount">${plan.promoEnabled?`<del>¥${money(plan.originalCents)}</del> `:''}<strong>¥${money(plan.effectiveCents)}</strong><span> / ${plan.kind==='premium'?'365天':plan.id==='vip-month'?'30天':'365天'}</span></p>
  <p>${plan.kind==='premium'?'付款后起算；未到期续购接尾，已到期重新起算。套餐有效期内新增课件可使用至原到期日。':'覆盖课件广场原会员权益和指定免费样例；不解锁新的精品专属课件。'}</p>
  <p class="pc-note">购买前，建议先体验免费课件，确认内容与使用效果符合您的教学需要，再选择套餐，请理性消费。购买后无特殊情况一般不予退款；如遇使用问题，请先联系我们协助处理。</p>
  <div data-qr></div><p data-status role="status">${canPay?'':'购买服务尚未开放，您可以先体验免费课件。'}</p><footer><button data-close>继续浏览</button><button data-pay class="pc-primary" ${canPay?'':'disabled'}>${token?'确认并微信支付':'登录后购买'}</button></footer>`;
  dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
  dialog.querySelector('[data-pay]').onclick=async()=>{
   if(!token){dialog.close();onLogin?.();return;}if(busy||!canPay)return;
   if(plan.kind==='vip'&&onVipCheckout){dialog.close();onVipCheckout(plan);return;}
   busy=true;const button=dialog.querySelector('[data-pay]');button.disabled=true;
   try{
    pending=pending||{itemType:plan.kind==='premium'?'premium_package':plan.id==='vip-month'?'member_month':'member_year',itemId:plan.kind==='premium'?plan.id:0,itemName:plan.name,price:plan.effectiveCents/100,requestId:crypto.randomUUID()};
    const d=await api('/api/pay/create-order',pending);if(!active)return;
    if(typeof d.code_url!=='string'||!d.code_url.startsWith('weixin://'))throw Error('订单二维码暂不可用，请勿重复付款。');
    const canvas=document.createElement('canvas');dialog.querySelector('[data-qr]').replaceChildren(canvas);
    await window.QRCode.toCanvas(canvas,d.code_url,{width:200,margin:2});status('请使用微信扫码支付。');button.textContent='正在等待付款';poll(d.out_trade_no);
   }catch(e){if(active){status(e.message);button.disabled=false;button.textContent='重试同一订单';}}finally{busy=false;}
  };
 }
 try{settings=await api(vipOnly?'/api/pay/vip-prices':'/api/premium/prices');plan=settings.plans.find(p=>p.id===planId);if(!plan)throw Error('该套餐当前不可购买，请返回查看其他套餐。');
  if(token&&plan.kind==='premium'){
   const account=await api('/api/premium/account');
   if(account.administrator){
    if(active){dialog.innerHTML='<h2>管理员可直接使用</h2><p>您拥有全部精品课的管理员使用权限，无需购买套餐。关闭此窗口后选择课件即可进入。</p><button class="pc-primary">返回课件</button>';dialog.querySelector('button').onclick=()=>dialog.close();}
    return;
   }
  }
  if(active)draw();}
 catch(e){if(active){dialog.innerHTML='<p role="status"></p><button>关闭</button>';dialog.querySelector('p').textContent=e.message;dialog.querySelector('button').onclick=()=>dialog.close();}}
}
