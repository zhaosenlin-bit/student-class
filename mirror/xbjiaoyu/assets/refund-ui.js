const labels = {pending:'退款申请待审核', approved:'已同意 · 待完成退款', rejected:'未通过退款申请', refunded:'已退款'};
export function createRefundUI({api, esc, money, modal, close, toast, refresh, title}) {
  const date = t => new Date(t).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai', hour12:false});
  function pageHeader(owner=false,admin=false){
    return `<header class="refund-page-heading"><div><a class="refund-back" href="${admin?'#admin':'#purchases'}">← ${admin?'返回管理后台':'返回我的课件'}</a><h1>${admin?'退款审核':'退款与售后'}</h1><p>${admin?'查看退款理由，决定是否同意退款。':'选择付款订单，填写退款理由，并在这里查看处理进度。'}</p></div>${owner&&!admin?'<a class="button secondary" href="#refund-admin">站主退款审核 ↗</a>':''}</header>`;
  }
  function loginMarkup(admin=false){
    return `<section class="refund-page">${pageHeader(false,admin)}<div class="refund-empty-state"><span class="refund-empty-icon" aria-hidden="true">↩</span><h2>${admin?'请使用站主账号登录':'登录后查看订单与退款'}</h2><p>${admin?'退款理由和审核操作仅站主可查看。':'请登录购买课件时使用的账号。付款后 7 天内可提交退款申请。'}</p><button class="button" data-action="${admin?'owner-login':'login'}">${admin?'站主登录':'登录购买账号'}</button></div></section>`;
  }
  function customerMarkup(orders=[],{owner=false}={}){
    const available=orders.filter(o=>o.refund?.eligible),submitted=orders.filter(o=>o.refund?.request);
    const pending=submitted.filter(o=>['pending','approved'].includes(o.refund.status));
    const others=orders.filter(o=>!o.refund?.eligible&&!o.refund?.request);
    const card=o=>`<article class="refund-customer-card"><div class="refund-order-heading"><div><h3>${esc(title(o.productId))}</h3><span class="refund-order-id">订单号 ${esc(o.id)}</span></div><strong class="refund-amount">${money(o.amount)}</strong></div><div class="refund-order-details"><span>${o.channel==='wechat'?'微信支付':'支付宝'}</span><span>${o.refund?.paidAt?'付款时间：'+date(o.refund.paidAt):'下单时间：'+date(o.created)}</span></div>${o.purchasePolicy?`<p class="subtle">${esc(o.purchasePolicy.notice)}</p>`:''}${orderMarkup(o)}${o.status==='pending'?'<p class="refund-window-closed">此订单尚未付款，无需申请退款。</p>':o.status==='payment_review'?`<p class="refund-window-closed">付款信息需要人工核实。</p><button class="button secondary small" data-action="service" data-id="${esc(o.id)}">联系人工售后</button>`:o.status==='expired'?'<p class="refund-window-closed">此订单未付款且已过期，无需申请退款。</p>':''}</article>`;
    const section=(label,list)=>list.length?`<section class="refund-order-section"><div class="admin-section-heading"><h2>${label}</h2><span class="refund-count">${list.length}</span></div><div class="refund-order-grid">${list.map(card).join('')}</div></section>`:'';
    return `<section class="refund-page">${pageHeader(owner)}<div class="refund-rules"><span class="refund-rule-symbol" aria-hidden="true">↩</span><div><strong>退款与售后规则</strong><p>请填写退款理由，由站主人工审核。超过 7 天不开放新的普通退款申请，已提交的申请仍会继续处理。数字资源订单按购买时确认的说明审核；质量、交付异常等问题仍可联系售后。</p></div></div><div class="refund-overview"><div><span>可申请退款</span><strong>${available.length}</strong></div><div><span>处理中</span><strong>${pending.length}</strong></div><div><span>我的订单</span><strong>${orders.length}</strong></div></div>${orders.length?section('可申请退款',available)+section('已提交的退款申请',submitted)+section('其他订单',others):'<div class="refund-empty-state"><span class="refund-empty-icon" aria-hidden="true">↩</span><h2>当前账号暂无订单</h2><p>如果你已购买，请确认登录的是付款时使用的账号。</p><a class="button secondary" href="#purchases">查看我的课件</a></div>'}</section>`;
  }
  function adminPageMarkup(requests=[]){
    return `<section class="refund-page">${pageHeader(true,true)}${adminMarkup(requests)}</section>`;
  }
  function orderMarkup(order) {
    const r = order.refund;
    if (!r || !['paid','refunded'].includes(order.status)) return '';
    if (r.request) return `<div class="refund-order-status"><strong class="refund-status is-${esc(r.status)}">${labels[r.status] || ''}</strong><span>申请于 ${date(r.request.created)}</span><button class="text-button" data-action="refund-request" data-id="${esc(order.id)}">查看退款申请</button></div>`;
    if (order.status === 'refunded') return '<div class="refund-order-status"><strong class="refund-status is-refunded">已退款</strong></div>';
    return r.eligible ? `<div class="refund-order-status"><button class="button secondary small" data-action="refund-request" data-id="${esc(order.id)}">${order.purchasePolicy?'申请售后':'申请退款'}</button><span>在线申请截止：${date(r.deadline)}</span></div>` : `<span class="refund-window-closed">已超过 7 天在线退款申请期</span><button class="text-button" data-action="service" data-id="${esc(order.id)}">交付异常等问题联系售后</button>`;
  }
  async function open(orderId) {
    const {order} = await api('/api/orders/' + encodeURIComponent(orderId)), r = order.refund;
    if (r?.request) {
      modal(`<div class="dialog-content"><h2>${labels[r.status]}</h2><p>${esc(title(order.productId))}</p><p class="subtle">申请时间：${date(r.request.created)}</p><h3>退款理由</h3><p class="refund-reason">${esc(r.request.reason)}</p>${r.request.response?`<h3>处理说明</h3><p class="refund-reason">${esc(r.request.response)}</p>`:''}${r.status==='approved'?'<p>站主已同意退款，退款完成后会更新订单状态。</p>':''}</div>`); return;
    }
    if (!r?.eligible) { modal('<div class="dialog-content"><h2>暂不能提交退款申请</h2><p>仅支持已付款订单在付款后 7 天内提交在线退款申请。</p></div>'); return; }
    modal(`<form class="form" id="refund-request-form" data-order="${esc(order.id)}"><h2>申请退款</h2><p>${esc(title(order.productId))} · ${money(order.amount)}</p><p class="subtle">${order.purchasePolicy?esc(order.purchasePolicy.notice):'付款后 7 天内可申请，由站主根据退款理由审核，并非自动退款。'}提交申请不会立即取消课件权限。</p><p class="refund-deadline">申请截止：${date(r.deadline)}（北京时间）</p><label for="refund-reason">退款理由（必填）</label><textarea id="refund-reason" name="reason" rows="5" required minlength="4" maxlength="500" placeholder="请说明希望退款的原因，4–500 字"></textarea><p class="error" role="alert"></p><button class="button wide" type="submit">提交退款申请</button></form>`);
  }
  function adminMarkup(requests = []) {
    const pending = requests.filter(r => r.status === 'pending'), approved = requests.filter(r => r.status === 'approved'), done = requests.filter(r => !['pending','approved'].includes(r.status));
    const cards = list => list.map(r => `<article class="refund-review-card"><div class="refund-card-heading"><div><h3>${esc(title(r.productId))}</h3><span>${esc(r.username)} · ${esc(r.order_id)}</span></div><strong class="refund-status is-${esc(r.status)}">${labels[r.status]}</strong></div><div class="refund-facts"><span>${money(r.amount)} · ${r.channel==='wechat'?'微信支付':'支付宝'}</span><span>申请：${date(r.created)}</span></div><p class="refund-reason">${esc(r.reason)}</p>${r.response?`<p class="subtle refund-reason">处理说明：${esc(r.response)}</p>`:''}<div class="actions">${r.status==='pending'?`<button class="button small" data-action="review-refund" data-id="${r.id}" data-value="approved">同意退款</button><button class="button secondary small" data-action="review-refund" data-id="${r.id}" data-value="rejected">不予退款</button>`:r.status==='approved'?`<button class="button secondary small" data-action="refund-record" data-id="${esc(r.order_id)}" data-value="${r.amount}">登记已完成退款</button>`:''}</div></article>`).join('');
    return `<section class="refund-admin"><div class="admin-section-heading"><h2>退款申请</h2><span class="refund-count">${pending.length} 项待审核</span></div><p class="subtle">仅接收付款后 7 天内提交的退款申请。审核通过后，在支付商户平台完成退款，再登记退款结果。</p>${cards(pending)}${cards(approved)}${!pending.length&&!approved.length?'<div class="refund-empty">暂无待处理退款申请</div>':''}${done.length?`<details class="refund-history"><summary>已处理的申请（${done.length}）</summary>${cards(done)}</details>`:''}</section>`;
  }
  function review(id, decision) {
    modal(`<form class="form" id="refund-review-form" data-request="${esc(id)}" data-decision="${esc(decision)}"><h2>${decision==='approved'?'同意退款申请':'不予退款'}</h2><p>${decision==='approved'?'此步骤记录审核结果。请随后在支付商户平台完成全额退款，再登记退款结果。':'处理说明将展示给申请人。'}</p><label for="refund-response">处理说明${decision==='rejected'?'（必填）':'（选填）'}</label><textarea id="refund-response" name="response" rows="4" maxlength="500" ${decision==='rejected'?'required minlength="4"':''}></textarea><p class="error" role="alert"></p><button class="button wide" type="submit">${decision==='approved'?'确认同意':'确认不予退款'}</button></form>`);
  }
  async function submit(form) {
    const button = form.querySelector('[type="submit"]'), error = form.querySelector('.error'); button.disabled = true; error.textContent = '';
    try {
      const data = new FormData(form);
      if (form.id === 'refund-request-form') await api('/api/refund-requests', {orderId:form.dataset.order, reason:data.get('reason')});
      else await api('/api/admin/refund-requests', {id:Number(form.dataset.request), decision:form.dataset.decision, response:data.get('response')});
      close(); toast(form.id === 'refund-request-form'?'退款申请已提交':'审核结果已保存'); await refresh();
    } catch (e) { if (error.isConnected) error.textContent = e.message; }
    finally { if (button.isConnected) button.disabled = false; }
  }
  return {orderMarkup, open, adminMarkup, review, submit,customerMarkup,adminPageMarkup,loginMarkup};
}

