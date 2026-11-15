const states = { submitted:'待处理',exported:'已导出待处理',needs_info:'需补充资料',sent:'已发送邮箱',closed:'已关闭' };
const orderStates = { paid:'已支付',pending:'待支付',closed:'已关闭',cancelled:'已取消',refund_requesting:'退款处理中',refund_processing:'退款处理中',refund_failed:'退款待确认',refunded:'已退款' };
const money = cents => Number.isSafeInteger(cents) ? '¥' + (cents / 100).toFixed(2) : '待核对';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => !value ? '—' : /Z$/.test(value) ? new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}) : value;
function historyNote(event) {
  if (['resend_requested','resent'].includes(event.action)) {
    try { const detail=JSON.parse(event.note);return ['接收邮箱：'+detail.email,detail.phone?'联系电话：'+detail.phone:'',detail.note||''].filter(Boolean).join('；'); } catch {}
  }
  return event.note;
}
function setup(root,token) {
  if (!document.querySelector('link[data-invoice-style]')) {
    const link=document.createElement('link'); link.rel='stylesheet';link.href='/invoices/style.css';link.dataset.invoiceStyle='';document.head.append(link);
  }
  root.classList.add('invoice-panel');
  const call = async (path,method='GET',body) => {
    const res = await fetch('/api/invoices'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
    const data=await res.json();if(!res.ok||!data.success)throw Error(data.msg||'操作失败，请重试');return data;
  };
  return call;
}
function message(root,text,error=false) { const el=root.querySelector('[data-message]');if(el){el.textContent=text;el.classList.toggle('invoice-error',error);} }
function dialog(root,title,body) {
  root.querySelector('dialog')?.remove();
  const el=document.createElement('dialog');el.className='invoice-dialog';
  el.innerHTML=`<header><h3>${esc(title)}</h3><button type="button" data-close aria-label="关闭">×</button></header>${body}`;
  root.append(el);el.querySelector('[data-close]').onclick=()=>el.close();el.addEventListener('close',()=>el.remove());el.showModal();return el;
}
function confirmAction(root,{title,description,noteLabel='',ackLabel='',buttonLabel='确认'}) {
  return new Promise(resolve=>{
    const el=dialog(root,title,`<p>${esc(description)}</p><form>${noteLabel?`<label>${esc(noteLabel)}<textarea name="note" maxlength="300" required rows="3"></textarea></label>`:''}${ackLabel?`<label class="invoice-check"><input type="checkbox" name="ack" required> ${esc(ackLabel)}</label>`:''}<button class="btn btn-primary" type="submit">${esc(buttonLabel)}</button></form>`);
    let result=null;el.addEventListener('close',()=>resolve(result));
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const note=e.target.elements.note?.value.trim()||'';if(noteLabel&&!note)return;result={note,confirmExternal:!!e.target.elements.ack?.checked};el.close();};
  });
}
function pager(data) { return `<div class="invoice-pager"><button class="btn btn-outline" data-prev ${data.page<=1?'disabled':''}>上一页</button><span>第 ${data.page} 页 · 共 ${data.total} 条</span><button class="btn btn-outline" data-next ${data.page*data.pageSize>=data.total?'disabled':''}>下一页</button></div>`; }

export function mountOrders(root,{token}) {
  const call=setup(root,token);let page=1,sequence=0;
  async function load() {
    const request=++sequence;root.innerHTML='<p role="status">正在读取我的订单…</p>';
    try {
      const data=await call('/orders?page='+page);if(!root.isConnected||sequence!==request)return;
      root.innerHTML=`<h3>我的订单</h3><p class="invoice-help">已支付订单可申请发票。工作人员开具后直接发送至您填写的邮箱。</p><p data-message role="status"></p><div class="invoice-cards">${data.orders.map(o=>`<article class="invoice-card"><div class="invoice-card-heading"><h4>${esc(o.title)}</h4><span>${esc(orderStates[o.status]||o.status)}</span></div><p class="invoice-meta">订单号 ${esc(o.tradeNo)}<br>下单时间 ${esc(date(o.createdAt))}${o.paidAt?'<br>支付时间 '+esc(date(o.paidAt)):''}</p><p>${['paid','refund_requesting','refund_processing','refunded','refund_failed'].includes(o.status)?'实付':'订单金额'} <strong>${money(o.grossCents)}</strong>${o.refundedCents?' · 已退款 '+money(o.refundedCents):''}</p>${o.invoice?`<p>发票：${esc(states[o.invoice.status])}${o.invoice.needsReview?' · 订单变动待核对':''}</p>${o.invoice.status==='sent'?`<p class="invoice-help">已发送至 ${esc(o.invoice.delivery?.lastSentEmail||o.invoice.email)}，请查收。</p>`:''}${o.invoice.note?`<p>${esc(o.invoice.note)}</p>`:''}<button class="btn btn-outline" data-invoice="${o.id}">${o.invoice.status==='needs_info'?'补充资料':o.invoice.status==='submitted'?'修改申请资料':'查看申请'}</button>${o.invoice.status==='sent'?`<p class="invoice-help">${o.invoice.delivery?.status==='pending'?'补发请求已登记，等待工作人员处理。':o.invoice.delivery?.lastSentAt?'最近补发登记：'+esc(date(o.invoice.delivery.lastSentAt)):''}</p><button class="btn btn-outline" data-resend="${o.id}" ${o.invoice.delivery?.status==='pending'?'disabled':''}>${o.invoice.delivery?.status==='pending'?'待补发':'未收到邮件 / 联系工作人员'}</button>`:''}`:o.canApply?`<button class="btn btn-primary" data-invoice="${o.id}">申请发票</button>`:`<p class="invoice-help">${esc(o.reason)}</p>`}</article>`).join('')||'<p class="invoice-empty">暂无订单</p>'}</div>${pager(data)}`;
      root.querySelector('[data-prev]').onclick=()=>{page--;load();};root.querySelector('[data-next]').onclick=()=>{page++;load();};
      root.querySelectorAll('[data-resend]').forEach(b=>b.onclick=()=>openResend(data.orders.find(o=>o.id===Number(b.dataset.resend))));
      root.querySelectorAll('[data-invoice]').forEach(b=>b.onclick=()=>openForm(data.orders.find(o=>o.id===Number(b.dataset.invoice)),data.profile));
    } catch(error) { if(root.isConnected&&sequence===request){root.innerHTML='<p data-message role="alert"></p><button class="btn btn-outline" data-retry>重新加载</button>';message(root,error.message,true);root.querySelector('[data-retry]').onclick=load;} }
  }
  function openResend(order) {
    const invoice=order.invoice;
    const el=dialog(root,'联系开票工作人员',`<p class="invoice-help">请先检查垃圾邮件。填写接收邮箱和手机号后，我们会在后台登记补发请求，由工作人员核对并补发原发票。</p><form><label>补发收件邮箱<input name="email" type="email" required maxlength="254" value="${esc(invoice.delivery?.lastSentEmail||invoice.email)}"></label><label>联系电话<input name="phone" type="tel" required maxlength="24" value="${esc(invoice.phone)}"></label><label>补发说明（选填）<textarea name="note" maxlength="300" rows="3" placeholder="例如：邮箱写错或一直未收到"></textarea></label><p data-message role="status"></p><button class="btn btn-primary" type="submit">登记补发请求</button></form>`);
    el.querySelector('form').onsubmit=async e=>{
      e.preventDefault();const button=e.target.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
      try{await call('/orders/'+order.id+'/resend','POST',{...Object.fromEntries(new FormData(e.target)),version:invoice.version});el.close();await load();message(root,'补发请求已登记，工作人员会核对处理。');}
      catch(error){message(el,error.message,true);button.disabled=false;}
    };
  }
  function openForm(order,profile) {
    const invoice=order.invoice,editable=!invoice||['submitted','needs_info'].includes(invoice.status);
    const info=invoice||profile||{titleType:'company'};
    const el=dialog(root,editable?invoice?'修改申请资料':'申请发票':'发票申请',`<p>${esc(order.title)} · 申请金额 <strong>${money(invoice?.amountCents??order.amountCents)}</strong></p><p class="invoice-help">发票将由工作人员发送到下方邮箱，请核对邮箱和手机号。</p>${invoice?.note?'<p>'+esc(invoice.note)+'</p>':''}<form><fieldset ${editable?'':'disabled'}><label>抬头类型<select name="titleType"><option value="company" ${info.titleType==='company'?'selected':''}>单位</option><option value="person" ${info.titleType==='person'?'selected':''}>个人</option></select></label><label>发票抬头<input name="title" value="${esc(info.title)}" maxlength="120" required autocomplete="organization"></label><label data-tax>单位税号<input name="taxNumber" value="${esc(info.taxNumber)}" minlength="15" maxlength="20" autocapitalize="characters"></label><label>手机号<input name="phone" value="${esc(info.phone)}" type="tel" maxlength="24" required autocomplete="tel"></label><label>收件邮箱<input name="email" value="${esc(info.email)}" type="email" maxlength="254" required autocomplete="email"></label>${editable?'<label class="invoice-check"><input type="checkbox" name="saveProfile"> 保存为常用开票资料</label>':''}</fieldset><p data-message role="status"></p>${editable?'<button class="btn btn-primary" type="submit">提交申请</button>':`<p>状态：${esc(states[invoice.status])}</p><p class="invoice-help">如需修改已提交资料，请联系工作人员。</p>`}</form>`);
    const form=el.querySelector('form'),type=form.elements.titleType;
    const change=()=>{const company=type.value==='company';el.querySelector('[data-tax]').hidden=!company;form.elements.taxNumber.required=company;};type.onchange=change;change();
    form.onsubmit=async event=>{
      event.preventDefault();if(!editable)return;
      const button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
      const input=Object.fromEntries(new FormData(form));input.saveProfile=form.elements.saveProfile.checked;if(invoice)input.version=invoice.version;
      try {await call('/orders/'+order.id+'/apply',invoice?'PUT':'POST',input);el.close();await load();message(root,'申请已提交，工作人员开票后将发送到您填写的邮箱。');}
      catch(error){message(el,error.message,true);button.disabled=false;}
    };
  }
  load();
}

export function mountAdmin(root,{token,orderQuery=''}) {
  const call=setup(root,token);let page=1,status='',q=orderQuery,dateField='requested',from='',to='',sequence=0,pendingExport=null;
  const filters=()=>new URLSearchParams({page,status,q,dateField,from,to});
  let downloadUrl=null,downloadTimer=null;
  async function download(batchId,report=false) {
    const res=await fetch(report?'/api/invoices/admin/report?'+filters():'/api/invoices/admin/exports/'+batchId,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if(!res.ok){const data=await res.json();throw Error(data.msg||'导出文件读取失败');}
    const file=await res.blob();if(!root.isConnected)return;
    if(downloadUrl)URL.revokeObjectURL(downloadUrl);clearTimeout(downloadTimer);
    root.querySelector('[data-download-link]')?.remove();
    const url=URL.createObjectURL(file),link=document.createElement('a');downloadUrl=url;
    link.href=url;link.download=report?'发票对账明细.xlsx':'发票申请-'+batchId+'.xlsx';link.dataset.downloadLink='';link.textContent=' 保存 Excel 文件';
    root.querySelector('[data-message]').append(link);link.click();
    // Keep a visible user-gesture fallback for browsers that block automatic
    // blob downloads after an asynchronous request. Batch download is repeatable.
    downloadTimer=setTimeout(()=>{URL.revokeObjectURL(url);link.remove();if(downloadUrl===url)downloadUrl=null;},300000);
  }
  async function load() {
    const request=++sequence;root.innerHTML='<p role="status">正在读取发票申请…</p>';
    try {
      const data=await call('/admin?'+filters());if(!root.isConnected||request!==sequence)return;
      root.innerHTML=`<h3>发票申请</h3><div class="invoice-summary" aria-label="全部发票待办"><strong>待办 ${data.summary.pending} 条</strong><span>待处理 ${data.summary.submitted}</span><span>已导出 ${data.summary.exported}</span><span>需补资料 ${data.summary.needs_info}</span><span>待补发 ${data.summary.resend}</span><span>最长等待 ${data.summary.oldestWaitingDays} 天</span></div><p class="invoice-help">导出后交给工作人员开票并发邮件，完成后在这里标记“已发送”。订单或退款有变动时先核对。</p><form class="invoice-filters"><label>状态<select name="status"><option value="">全部</option><option value="resend" ${status==='resend'?'selected':''}>待补发</option>${Object.entries(states).map(([v,label])=>`<option value="${v}" ${status===v?'selected':''}>${label}</option>`).join('')}</select></label><label>订单号或抬头<input name="q" value="${esc(q)}" maxlength="100"></label><label>日期类型<select name="dateField">${Object.entries({requested:"申请时间",created:"下单时间",paid:"支付时间",refunded:"退款时间",sent:"首次发送登记时间"}).map(([value,label])=>`<option value="${value}" ${dateField===value?"selected":""}>${label}</option>`).join("")}</select></label><label>开始日期<input type="date" name="from" value="${esc(from)}"></label><label>结束日期<input type="date" name="to" value="${esc(to)}"></label><button class="btn btn-outline">查询</button><button type="button" class="btn btn-outline" data-report>导出筛选对账明细</button><button type="button" class="btn btn-primary" data-export>导出选中申请</button></form><p class="invoice-help">待办数量为全部申请；下表按条件筛选，日期均为北京时间。对账明细不会交接或改变申请状态。</p><p data-message role="status"></p><div class="invoice-table-wrap"><table><thead><tr><th>选择</th><th>订单 / 金额</th><th>开票资料</th><th>联系方式</th><th>状态 / 操作</th></tr></thead><tbody>${data.requests.map(r=>`<tr><td><input type="checkbox" data-select="${r.id}" aria-label="选择申请 ${r.id}" ${r.status==='submitted'&&!r.needsReview&&r.order.canApply?'':'disabled'}></td><td><strong>${esc(r.order.title)}</strong><br><span class="invoice-meta">${esc(r.order.tradeNo)}</span><br>实付 ${money(r.order.grossCents)}<br>退款 ${money(r.order.refundedCents)}<br>申请 ${money(r.amountCents)}<br>${esc(r.order.merchant)}<br><span class="invoice-meta">申请 ${esc(date(r.createdAt))}</span></td><td>${r.titleType==='company'?'单位':'个人'} · ${esc(r.title)}<br>${esc(r.taxNumber)}</td><td>${esc(r.phone)}<br>${esc(r.email)}${r.delivery?.status==='pending'?`<p class="invoice-error">待补发至 ${esc(r.delivery.email)}<br>联系电话 ${esc(r.delivery.phone)}<br>${esc(r.delivery.note)}<br>已等待 ${r.delivery.waitingDays} 天</p>`:''}</td><td><strong>${esc(states[r.status])}</strong>${['submitted','exported','needs_info'].includes(r.status)?`<p class="invoice-meta">已等待 ${r.waitingDays} 天</p>`:''}${r.sentAt?`<p class="invoice-meta">首次发送登记 ${esc(date(r.sentAt))}</p>`:''}${r.delivery?.lastSentAt?`<p class="invoice-meta">最近补发 ${esc(date(r.delivery.lastSentAt))}</p>`:''}${r.needsReview?'<p class="invoice-error">订单有变动，需核对</p>':''}${r.note?'<p>'+esc(r.note)+'</p>':''}<div class="invoice-actions">${r.delivery?.status==='pending'?`<button data-action="resent" data-id="${r.id}">登记已补发</button>`:''}${r.needsReview&&r.status!=='closed'?`<button data-action="review" data-id="${r.id}">登记核对结果</button>`:''}${r.batchId?`<button data-download="${esc(r.batchId)}">重新下载批次</button>`:''}${r.status==='exported'?`<button data-action="sent" data-id="${r.id}">标记已发送</button>`:''}${!['sent','closed'].includes(r.status)?`<button data-action="needs_info" data-id="${r.id}">退回补充资料</button><button data-action="closed" data-id="${r.id}">关闭申请</button>`:''}<button data-history="${r.id}">处理记录</button></div></td></tr>`).join('')||'<tr><td colspan="5">暂无申请</td></tr>'}</tbody></table></div>${pager(data)}`;
      root.querySelector('.invoice-filters').onsubmit=e=>{e.preventDefault();const fields=e.target.elements;
        if(fields.from.value&&fields.to.value&&fields.from.value>fields.to.value){message(root,'开始日期不能晚于结束日期，请修改后查询。',true);fields.to.focus();return;}
        status=fields.status.value;q=fields.q.value.trim();dateField=fields.dateField.value;from=fields.from.value;to=fields.to.value;page=1;load();};
      root.querySelector('[data-prev]').onclick=()=>{page--;load();};root.querySelector('[data-next]').onclick=()=>{page++;load();};
      const badge=document.querySelector('[data-invoice-badge]');if(badge)badge.textContent=data.summary.pending?'（'+data.summary.pending+'）':'';
      root.querySelector('[data-report]').onclick=async e=>{const button=e.currentTarget;button.disabled=true;try{message(root,'正在生成当前筛选条件的对账明细…');await download(null,true);}catch(error){message(root,error.message,true);}finally{button.disabled=false;}};
      root.querySelector('[data-export]').onclick=async e=>{
        const button=e.currentTarget,items=[...root.querySelectorAll('[data-select]:checked')].map(c=>{const r=data.requests.find(r=>r.id===Number(c.dataset.select));return {id:r.id,version:r.version};});
        if(!items.length)return message(root,'请先选择待处理申请',true);
        if(!await confirmAction(root,{title:'导出开票资料',description:`将 ${items.length} 条申请导出并锁定资料，之后交给工作人员处理。`,buttonLabel:'确认导出'}))return;
        button.disabled=true;
        const signature=JSON.stringify(items);if(!pendingExport||pendingExport.signature!==signature)pendingExport={signature,items,batchId:crypto.randomUUID()};
        try {const result=await call('/admin/exports','POST',{items:pendingExport.items,batchId:pendingExport.batchId});pendingExport=null;
          try{await load();message(root,'导出批次已生成。请保存文件交给工作人员；邮件发出后再标记已发送。');await download(result.batchId);}
          catch(error){await load();message(root,'批次已生成：'+error.message+'。可使用“重新下载批次”重试。',true);}
        } catch(error){message(root,error.message,true);button.disabled=false;}
      };
      root.querySelectorAll('[data-download]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await download(b.dataset.download);}catch(error){message(root,error.message,true);}finally{b.disabled=false;}});
      root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(data.requests.find(r=>r.id===Number(b.dataset.id)),b.dataset.action,b));
      root.querySelectorAll('[data-history]').forEach(b=>b.onclick=async()=>{try{const history=await call('/admin/'+b.dataset.history+'/history');if(root.isConnected)dialog(root,'处理记录',`<ol class="invoice-history">${history.events.map(e=>`<li><strong>${esc({submitted:'提交申请',edited:'客户修改资料',resubmitted:'补充资料',resend_requested:'登记补发请求',resent:'工作人员已补发',exported:'导出批次',needs_info:'退回补充',sent:'已发送',closed:'关闭申请',review:'核对订单变动'}[e.action]||e.action)}</strong> · ${esc(date(e.createdAt))}<p>${esc(historyNote(e))}</p></li>`).join('')}</ol>`);}catch(error){message(root,error.message,true);}});
    } catch(error){if(root.isConnected&&sequence===request){root.innerHTML='<p data-message role="alert"></p><button class="btn btn-outline" data-retry>重新加载</button>';message(root,error.message,true);root.querySelector('[data-retry]').onclick=load;}}
  }
  async function action(row,action,button) {
    const labels={resent:'登记已补发',sent:'标记已发送',needs_info:'退回补充资料',closed:'关闭申请',review:'登记核对结果'};
    const options={title:labels[action],description:`${row.title} · 申请金额 ${money(row.amountCents)} · 收件邮箱 ${row.email}`};
    if(action==='resent'){
      options.description=`补发原发票至 ${row.delivery.email}，联系电话 ${row.delivery.phone}`;options.noteLabel='补发处理说明';options.ackLabel='工作人员已向以上邮箱发送原发票，并已核对订单变动';
    } else if(action==='sent'){
      options.ackLabel='工作人员已开具发票，并发送到以上邮箱';
      if(row.needsReview||!row.order.canApply)options.noteLabel='订单已变动，请填写实际开具和发送情况；保存后仍需核对变动';
    } else {
      options.noteLabel=action==='needs_info'?'需要客户补充的资料（客户可见）':action==='closed'?'关闭原因（客户可见）':row.status==='sent'?'订单变动后的外部处理结果':'核对最新金额后的处理说明';
      if(['exported','sent'].includes(row.status))options.ackLabel=row.status==='sent'?'已与工作人员核对并处理本次订单变动':'工作人员尚未开票，已撤回旧导出资料';
    }
    const decision=await confirmAction(root,options);if(!decision||!root.isConnected)return;
    button.disabled=true;
    try {await call('/admin/'+row.id+(action==='resent'?'/resend':''),'PUT',{action,...decision,version:row.version,deliveryVersion:row.delivery?.version});await load();message(root,'处理结果已保存');}
    catch(error){message(root,error.message,true);button.disabled=false;}
  }
  load();
}
