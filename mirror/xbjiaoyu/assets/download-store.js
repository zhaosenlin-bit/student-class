import {orderCourses} from './course-order.js?v=delivery-parity-20261023.1';
import {countdownMarkup,promotionNow} from './promotion-countdown.js?v=20261019';
import {libraryChapters} from './library-view.js?v=refund-entry-20261020';
export const downloadEditions=[['all','全部课件'],['integrated','三维整合版'],['2d-integrated','二维整合版'],['standalone','三维独立版'],['2d-standalone','二维独立版']];
export const validDownloadEdition=value=>downloadEditions.some(([key])=>key===value)?value:'all';
export const matchesDownloadEdition=(product,edition='all')=>edition==='all'||(product.dimension==='2d')===edition.startsWith('2d-')&&(edition.endsWith('integrated')?product.edition==='integrated':product.edition!=='integrated');
export function createDownloadUI({api,esc,money,getInfo,getUser,product,main,modal,close,toast,login,refresh,showPayment,refundUI}){
 let chosenScope='',returnResource='',busy=false;
 const integrated=p=>p?.edition==='integrated';
 const editionLabel=p=>(p.dimension==='2d'?'二维':'三维')+(integrated(p)?'整合版':'独立版');
 const unavailable=p=>p?.downloadable===false||['unavailable','integrated-scope-unavailable'].includes(p?.downloadReason);
 const resourceScopes=p=>(getInfo().downloadScopes||[]).filter(s=>s.productIds.includes(p.id));
 const editionTabs=(products,selected='all',action='download-edition')=>`<nav class="download-edition-tabs" aria-label="课件版本目录">${downloadEditions.map(([value,title])=>`<button type="button" data-action="${action}" data-value="${value}" aria-pressed="${selected===value}"><strong>${title}</strong><span>${products.filter(p=>matchesDownloadEdition(p,value)).length} 份</span></button>`).join('')}</nav>`;
 const offer=p=>p?.promotion?.active&&promotionNow()<p.promotion.endsAt;
 const promotion=p=>offer(p)?`<div class="download-year-offer"><strong>年卡今日优惠 ${money(p.price)}</strong>${countdownMarkup(p.promotion.endsAt)}<p>北京时间 10 月 21 日 00:00 恢复 ${money(p.promotion.originalPrice)}。</p></div>`:'';
 const date=t=>new Date(t).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'});
 const quota=p=>Number.isSafeInteger(p?.quota)&&p.quota>0?p.quota:null;
 const trial=p=>[p?.id,p?.planId,p?.cardPlanId].includes('download-trial2');
 const count20=p=>[p?.id,p?.planId,p?.cardPlanId].includes('download-count20');
 const integratedLimit=p=>Number.isSafeInteger(p?.integratedLimit)&&p.integratedLimit>0?p.integratedLimit:count20(p)?8:null;
 const integratedUsed=p=>Number.isSafeInteger(p?.integratedUsed)&&p.integratedUsed>=0?p.integratedUsed:null;
 const remainingIntegrated=p=>Number.isSafeInteger(p?.remainingIntegrated)&&p.remainingIntegrated>=0?p.remainingIntegrated:integratedUsed(p)!==null&&integratedLimit(p)!==null?Math.max(0,Math.min(Math.floor(p.remaining/2),integratedLimit(p)-integratedUsed(p))):null;
 const selectionCost=p=>Number.isSafeInteger(p?.selectionCost)&&p.selectionCost>0?p.selectionCost:integrated(p)?2:1;
 const countSelectionText=p=>{
  const cost=selectionCost(p),balance=Number.isSafeInteger(p.remaining)&&p.remaining>=0?p.remaining:null,name=trial(p)?'尝鲜卡':'次卡',limit=integratedLimit(p),used=integratedUsed(p);
  const selectedAfter=used===null?null:used+(integrated(p)?1:0),availableAfter=balance===null||selectedAfter===null||limit===null?null:Math.max(0,Math.min(Math.floor((balance-cost)/2),limit-selectedAfter));
  const cap=count20(p)&&limit!==null?`本卡整合版最多选 ${limit} 份。${used===null?'':`已选 ${used} 份${integrated(p)?`，本次选用后为 ${used+1} / ${limit} 份`:''}。`}${selectedAfter!==null&&selectedAfter>=limit?'整合版名额已用满后，剩余额度仍可选独立版。':availableAfter!==null?`本次选用后最多还可选 ${availableAfter} 份整合版，以本卡剩余额度和名额共同计算。`:''}`:'';
  return `本次${integrated(p)?'整合版':'独立版'}消耗${name} ${cost} 额度。${balance===null?'':`当前本卡剩余 ${balance} 额度，选用后剩余 ${Math.max(0,balance-cost)} 额度。`}${balance!==null&&balance-cost===1?'剩余 1 额度仅可再选 1 份独立版。':''}${cap}同一资源重复下载不扣额度，也不占新的整合版名额。`;
 };
 const trialBalanceText=c=>!c.active?'当前卡不可使用。':c.remaining>=2?'可选 2 份独立版或 1 份整合版。':c.remaining===1?'仅可再选 1 份独立版，不能选用新的整合版。':'额度已用完，已选资源可重复下载。';
 const countBalanceText=c=>{
  const limit=integratedLimit(c),used=integratedUsed(c),available=remainingIntegrated(c),summary=used===null?`整合版最多选 ${limit} 份。`:`已选整合版 ${used} / ${limit} 份。`;
  return summary+(!c.active?'当前卡不可使用。':c.remaining===0?'额度已用完，已选资源可重复下载。':used!==null&&used>=limit?`已达到整合版上限，剩余 ${c.remaining} 额度仍可选 ${c.remaining} 份独立版。`:c.remaining===1?'仅余 1 额度，可再选 1 份独立版，不能选用新的整合版。':available===null?`剩余 ${c.remaining} 额度可继续选用；独立版扣 1、整合版扣 2。`:`当前最多可再选 ${available} 份整合版，或用剩余额度选独立版；两类可混合选用。`);
 };
 const warning=()=>`<p class="download-warning">${esc(getInfo().downloadWarning)}</p>`;
 const refundNotice=()=>getInfo().downloadRefundNotice||'本商品为可下载的数字化课件。下载后不适用七日无理由退货；如存在文件损坏、无法正常使用或与商品说明不符等问题，可联系售后处理。';
 const upgradeEligibility=()=>{const cutoff=getInfo().downloadUpgradePolicy?.eligiblePaidBefore;return cutoff?'仅限北京时间 '+new Date(cutoff).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+' 前已付款的同学科年卡（含旧课件包转入的年卡）。此后新购年卡不享受本次补差价升级。':'';};
 const upgrades=()=>getInfo().downloadAccount?.cards?.map(c=>c.upgrade).filter(Boolean)||[];
 const repurchaseBadge=p=>p.repurchaseDiscount?'<p class="download-repurchase-offer"><strong>老用户专享 · 8.5 折</strong><span>购买其他学科永久卡，已为您减免 '+money(p.repurchaseDiscount.originalPrice-p.price)+'</span></p>':'';
 const orderedBundleItems=p=>[...p.bundleDiscount.items].sort((a,b)=>(getInfo().downloadScopes||[]).findIndex(s=>s.id===a.scope)-(getInfo().downloadScopes||[]).findIndex(s=>s.id===b.scope));
 const allSubjectTerms='包含本次所列科目的独立版、整合版及后续新增课件，不限次数下载。未来新增科目需另购，继续享 8.5 折。';
 const allSubjectCreditRule='按原订单实付金额抵扣，不同科目可累计，同一科目取最高一笔，不重复抵扣。退款处理中的订单暂不参与抵扣。';
 const creditTitle=c=>/年卡|永久卡|永久版/.test(c.title)?c.title:c.title+(c.type==='year'?'年卡':'永久卡');
 const allSubjectUpgradeButton=p=>`<button class="button wide" data-download-action="checkout" data-id="${esc(p.id)}" ${getInfo().selling?'':'disabled'}>${getInfo().selling?p.price===0?'确认升级全科永久卡':'补 '+money(p.price)+' 升级全科永久卡':'暂未开放购买'}</button>`;
 const allSubjectLibraryOffer=()=>{
  const p=getInfo().downloadPlans?.find(p=>p.allSubjects&&p.purchasable&&p.allSubjectUpgrade);if(!p)return '';
  const q=p.allSubjectUpgrade;
  return `<section class="download-library-upgrade" aria-labelledby="library-upgrade-title"><div><span class="all-subjects-badge">已购权益 · 实付抵扣</span><h2 id="library-upgrade-title">升级全科永久卡</h2><p>已为您选出 ${q.credits.length} 个科目的可抵扣订单，共 ${money(q.creditAmount)}。</p><small>不同科目可累计，同一科目取最高一笔。确认前可查看抵扣明细。</small></div><div class="library-upgrade-action"><span>${p.price===0?'抵扣后无需补款':'本次只需补差价'}</span><strong>${money(p.price)}</strong>${allSubjectUpgradeButton(p)}</div></section>`;
 };
 const allSubjectOffer=()=>{
  const info=getInfo(),p=info.downloadPlans?.find(p=>p.allSubjects);if(!p?.bundleDiscount)return '';
  const d=p.bundleDiscount,q=p.allSubjectUpgrade,owned=d.ownedScopeIds.length,available=p.purchasable;
  return `<article class="download-all-subjects${q?' has-upgrade-credit':''}" aria-labelledby="all-subjects-title"><div class="all-subjects-copy"><span class="all-subjects-badge">${q?'已购权益 · 实付抵扣':'全科合购 · 8.5 折'}</span><h2 id="all-subjects-title">${q?'升级全科永久卡':'全科永久版'}</h2><p>${available?q?'已购单科年卡、永久卡可抵扣，只需补足差价。':owned?'补齐未开通科目，已有永久版不重复收费。':'一次开通当前全部科目，长期教学从容选用。':'当前全部科目均已开通永久版。'}</p><div class="all-subjects-list">${(available?orderedBundleItems(p):info.downloadScopes||[]).map(s=>`<span>${esc(s.title)}</span>`).join('')}</div>${q?`<p class="all-subjects-credit-note"><strong>${q.credits.length} 科已购权益可抵 ${money(q.creditAmount)}</strong><span>不同科目可累计，同一科目取最高一笔。</span></p>`:''}<p class="all-subjects-terms">${allSubjectTerms}</p>${!getUser()&&available?'<p class="all-subjects-login-hint">已有年卡或永久卡？登录后查看专属补差价。</p>':''}</div><div class="all-subjects-buy">${available?`<span class="all-subjects-price-label">${q?p.price===0?'抵扣后无需补款':'本次只需补差价':owned?'未开通科目合计 · 永久授权':'全科合计 · 永久授权'}</span><p class="all-subjects-price">${money(p.price)}</p>${q?`<dl class="all-subjects-calculation"><div><dt>合购价 · 8.5 折</dt><dd>${money(q.basePrice)}</dd></div><div><dt>已购实付抵扣</dt><dd>− ${money(q.creditAmount)}</dd></div></dl>`:`<p class="all-subjects-saving"><del>${money(d.originalPrice)}</del><span>立省 ${money(d.originalPrice-p.price)}</span></p>`}`:'<p class="all-subjects-owned">已全部开通</p>'}${q&&available?allSubjectUpgradeButton(p):`<button class="button wide" data-download-action="checkout" data-id="${esc(p.id)}" ${info.selling&&available?'':'disabled'}>${!available?'无需重复购买':info.selling?owned?'补齐全科永久版':'购买全科永久版':'暂未开放购买'}</button>`}${available?`<small>${q?'确认前可查看每科抵扣明细':'原价合计 × 85%，优惠不叠加'}</small>`:''}</div></article>`;
 };
 function allSubjectCheckout(p){
  const d=p.bundleDiscount,q=p.allSubjectUpgrade,basePrice=q?.basePrice??p.price;
  if(!p.purchasable){toast('当前全部科目均已开通永久版，无需重复购买');return;}
  const credits=q?`<section class="all-subjects-credit-details" aria-labelledby="upgrade-credit-title"><h3 id="upgrade-credit-title">已购权益抵扣明细</h3><dl>${q.credits.map(c=>`<div><dt>${esc(creditTitle(c))}${c.components?.length>1?'<small>原年卡及同科升级款合计</small>':''}<small>来源订单：${esc(c.sourceOrderId)}</small></dt><dd>− ${money(c.amount)}</dd></div>`).join('')}</dl><p>${allSubjectCreditRule}</p></section>`:'';
  modal(`<div class="dialog-content download-all-subject-checkout"><p class="eyebrow">${q?'确认升级 · 已购实付抵扣':'确认下载授权 · 全科合购'}</p><h2>${q?'升级全科永久卡':'全科永久版'}</h2><dl class="download-upgrade-breakdown">${orderedBundleItems(p).map(s=>`<div><dt>${esc(s.title)}永久版</dt><dd>${money(s.originalPrice)}</dd></div>`).join('')}<div><dt>原价合计</dt><dd>${money(d.originalPrice)}</dd></div><div><dt>合购优惠 · 8.5 折</dt><dd>− ${money(d.originalPrice-basePrice)}</dd></div>${q?`<div><dt>合购价</dt><dd>${money(basePrice)}</dd></div><div class="upgrade-credit"><dt>已购实付抵扣</dt><dd>− ${money(q.creditAmount)}</dd></div>`:''}<div class="upgrade-total"><dt>${q?'本次补差价':'本次支付'}</dt><dd>${money(p.price)}</dd></div></dl>${credits}${q&&p.price===0?'<p class="all-subjects-zero-notice">抵扣至本次应付为 0，确认后即可开通；不产生余额或提现。</p>':''}${d.ownedScopeIds.length?q?'<p>未列入本次购买范围的已有科目永久权益保留，不重复收费。</p>':'<p>已有科目的永久权益保留，本次仅购买以上尚未开通的科目。</p>':''}<p>${allSubjectTerms}</p><p>仅限您本人教学使用。请先下载免费课件，确认教学电脑能够正常运行。</p><div class="download-refund-notice"><strong>购买前请确认</strong><p>${esc(refundNotice())}</p></div><label class="download-policy-check"><input type="checkbox" id="download-policy-accepted"><span>我已阅读并确认上述数字资源购买及售后说明。</span></label><div class="actions">${q&&p.price===0?`<button class="button wide" disabled data-download-action="pay" data-id="${esc(p.id)}" data-channel="credit" data-price="0">确认升级，无需补款</button>`:getInfo().channels.map(c=>`<button class="button" disabled data-download-action="pay" data-id="${esc(p.id)}" data-channel="${c}" data-price="${p.price}">${c==='wechat'?'微信支付':'支付宝'}</button>`).join('')}</div><p class="error" id="download-payment-error" role="alert"></p></div>`);
 }
 const bestUpgrade=scope=>upgrades().filter(q=>q.scope===scope).sort((a,b)=>a.price-b.price)[0];
 const upgradeBreakdown=q=>`<dl class="download-upgrade-breakdown"><div><dt>永久卡现价</dt><dd>${money(q.permanentPrice)}</dd></div><div><dt>年卡现价抵扣</dt><dd>− ${money(q.annualPrice)}</dd></div><div class="upgrade-total"><dt>本次补差价</dt><dd>${money(q.price)}</dd></div></dl>`;
 const upgradeButton=q=>`<button class="button wide download-upgrade-button" data-download-action="upgrade" data-id="${esc(q.sourceCardId)}" ${getInfo().selling?'':'disabled'}>补 ${money(q.price)} 升级永久卡</button>`;
 async function upgradeCheckout(cardId){
  if(!getUser()){login();return;}
  await refresh();const q=upgrades().find(q=>q.sourceCardId===cardId);
  if(!q){toast('当前年卡暂不能升级，请刷新权益查看');return;}
  modal(`<div class="dialog-content download-upgrade-checkout"><p class="eyebrow">年卡补差价</p><h2>${esc(q.title)}</h2>${upgradeBreakdown(q)}<p>支付成功后，原年卡升级为同学科永久卡，独立版、整合版及后续新增资源均可下载。</p><p class="subtle">${esc(upgradeEligibility())}</p><p class="subtle">差价按升级时的永久卡现价减去年卡现价计算，与原年卡付款金额和剩余天数无关；多张年卡不合并抵扣。</p><div class="download-refund-notice"><strong>购买前请确认</strong><p>${esc(refundNotice())}</p></div><label class="download-policy-check"><input type="checkbox" id="download-policy-accepted"><span>我已阅读并确认上述数字资源购买及售后说明。</span></label><div class="actions">${getInfo().channels.map(c=>`<button class="button" disabled data-download-action="pay" data-id="${esc(q.planId)}" data-source-card="${esc(q.sourceCardId)}" data-channel="${c}" data-price="${q.price}">${c==='wechat'?'微信支付':'支付宝'}</button>`).join('')}</div><p class="error" id="download-payment-error" role="alert"></p></div>`);
 }
 function card(p){
  const state=p.mode==='free'?'免费下载':integrated(p)?unavailable(p)?'暂未开放':p.downloadReason==='count'?trial(p)?'尝鲜卡可选':'次卡可选':p.canDownload?'已解锁':'选择下载卡':p.mode==='free'?'免费下载':p.downloadReason==='count'?'可选资源':p.canDownload?'已解锁':'下载资源';
  return `<article class="product-card download-resource"><a class="cover" href="#course/${esc(p.id)}"><img src="${esc(p.cover)}" alt="${esc(p.title)}课件画面" loading="lazy" decoding="async" width="720" height="405"><span class="cover-badge">${esc(p.subject)} · ${editionLabel(p)}</span></a><div class="card-body"><div class="card-meta"><span>${esc((p.stages||[]).join(' · '))}</span><span${p.mode==='free'?' class="download-free-badge"':''}>${state}</span></div><a class="card-title" href="#course/${esc(p.id)}"><h3>${esc(p.title)}</h3></a><p class="card-description">${esc(p.description)}</p>${p.onlineAccessible?`<button class="button wide" data-action="trial" data-id="${esc(p.id)}">免费在线使用 ↗</button>`:''}<a class="button secondary wide" href="#course/${esc(p.id)}">查看资源 →</a></div></article>`;
 }
 function detail(p){
  const scopes=integrated(p)?resourceScopes(p):[],scopeText=scopes.map(s=>s.title).join(' / ');
  const status=unavailable(p)?'这份资源暂未开放下载。':p.mode==='free'?'登录后即可免费下载，不消耗下载卡额度。':p.downloadReason==='count'?countSelectionText(p):p.downloadReason==='repeat'?'这份资源已选用，再次下载不扣额度。':integrated(p)?p.canDownload?'当前账号可以下载这份整合版。':`整合版可用尝鲜卡或次卡的 2 额度，或${scopeText?' '+scopeText+' ':''}年卡、永久卡下载。次卡每张最多选 8 份整合版。${p.integratedLimitReached?'当前次卡已达到整合版上限，其剩余额度仍可选独立版；已选资源可重复下载。':p.count20Remaining===1?'当前次卡仅余 1 额度，可再选 1 份独立版。':''}${p.trialRemaining===1?'当前尝鲜卡仅余 1 额度，可再选 1 份独立版。':''}${p.count20Remaining===1||p.trialRemaining===1?'整合版需同一张卡至少 2 额度，不能合并不同卡的余额。':''}`:p.canDownload?'当前账号可以下载。':p.mode==='free'?'登录后即可免费下载，不消耗下载卡额度。':'下载前请登录并选择适用的下载卡。';
  document.title=p.title+' · 小白教育';
  main().innerHTML=`<article class="download-detail"><a class="intro-back" href="#catalog">← 课件库</a><header><p class="eyebrow">${esc((p.stages||[]).join(' · '))} / ${esc(p.subject)}</p><h1>${esc(p.title)}</h1><p>${esc(p.description)}</p></header><div class="download-overview"><figure><img src="${esc(p.cover)}" alt="${esc(p.title)}课件画面" fetchpriority="high" width="1280" height="720"></figure><aside class="download-panel"><span class="download-chip">${editionLabel(p)} · HTML 课件</span><h2>${p.mode==='free'?'<span class="download-free-badge">免费下载</span>':'下载资源'}</h2><p>保存到教学电脑，用浏览器打开文件。课件内的实验与操作保留。</p><p class="download-status">${esc(status)}</p>${p.onlineAccessible?`<button class="button wide" data-action="trial" data-id="${esc(p.id)}">免费在线使用 ↗</button><p class="subtle">无需下载即可体验，也可保存文件供离线教学使用。</p>`:''}<button class="button wide" data-download-action="download" data-id="${esc(p.id)}" ${unavailable(p)?'disabled':''}>${unavailable(p)?'暂未开放下载':integrated(p)&&p.mode!=='free'&&!p.canDownload?'选择下载卡':'↓ 下载课件'}</button>${warning()}<p class="subtle">手机可管理资源和购买；课堂演示建议在电脑浏览器打开下载文件。手机文件预览器可能无法运行互动内容。</p></aside></div><section class="download-content"><h2>教学内容</h2><div class="course-modules">${(p.modules||[{title:p.title,description:p.description}]).map(m=>`<section class="course-module"><div><h3>${esc(m.title)}</h3><p>${esc(m.description||'')}</p></div></section>`).join('')}</div><h2>打开与使用</h2><ol><li>下载后保留 .html 文件后缀，在教学电脑上用 Chrome 或 Edge 等浏览器打开。</li><li>开始上课前，检查所用电脑的显示、声音和核心操作；默认使用高清，卡顿时可在课件设置中调整画质。</li><li>仅供购买账号本人教学使用，不向其他账号转移授权。</li></ol></section></article>`;
  main().querySelector('.download-panel').insertAdjacentHTML('beforeend','<button type="button" class="button secondary wide download-feedback-link" data-action="intro-section" data-value="course-feedback">改进建议与反馈</button>');
  main().querySelector('.download-detail').insertAdjacentHTML('beforeend','<section id="course-feedback" class="course-section download-feedback" aria-labelledby="course-feedback-title" aria-live="polite"></section>');
 }
 function purchaseMarkup(id=''){
  const info=getInfo(),p=product(id),forIntegrated=integrated(p),scopeOrder=['physics-complete','chemistry-complete','high-school-physics'],scopes=[...(info.downloadScopes||[])].filter(s=>!forIntegrated||s.productIds.includes(id)).sort((a,b)=>scopeOrder.indexOf(a.id)-scopeOrder.indexOf(b.id));
  if(forIntegrated&&(!scopes.length||unavailable(p)))return `<section class="download-purchase"><div class="download-purchase-heading"><h1>暂未开放下载</h1><p>${esc(p.title)} · 整合版</p></div><p class="download-edition-notice">该整合版暂未开放对应学科下载权限。</p><a class="button secondary" href="#course/${esc(p.id)}">返回资源介绍</a></section>`;
  if(!scopes.some(s=>s.id===chosenScope))chosenScope=scopes.find(s=>s.productIds.includes(id))?.id||scopes[0]?.id||'';
  const plans=info.downloadPlans||[],options=[['download-trial2','尝鲜卡'],['download-count20','次卡'],['download-year-'+chosenScope,'年卡'],['download-permanent-'+chosenScope,'永久卡']].map(([id,title])=>({plan:plans.find(p=>p.id===id),title})).filter(o=>o.plan);
  const countSummary=options.filter(o=>o.plan.type==='count').map(({plan,title})=>trial(plan)?`${title} ${money(plan.price)}，2 份独立版或 1 份整合版`:`${title} ${money(plan.price)}，跨学科 ${quota(plan)} 额度，最多选 8 份整合版`).join('；');
  return `<section class="download-purchase ${forIntegrated?'download-integrated-purchase':''}"><div class="download-purchase-heading"><p class="eyebrow">小白教育 / 下载授权</p><h1>选择下载卡</h1>${p?`<p>正在选用：<strong>${esc(p.title)}</strong></p>`:'<p>按您的教学需要选择资源范围。</p>'}</div>${forIntegrated?'<p class="download-edition-notice">整合版可用尝鲜卡或次卡的 2 额度，或对应学科年卡、永久卡下载；次卡每张最多选 8 份整合版。</p>':''}<div class="download-scope"><p id="download-scope-label">选择年卡 / 永久卡的学科</p><div class="download-scope-options" role="group" aria-labelledby="download-scope-label">${scopes.map(s=>`<button type="button" data-download-action="scope" data-id="${esc(s.id)}" aria-pressed="${s.id===chosenScope}"><strong>${esc(s.title)}</strong><span>${s.productIds.length} 份资源</span></button>`).join('')}</div><p class="download-scope-summary">各学科同价：年卡 ${money(plans.find(p=>p.type==='year'&&p.scope===chosenScope)?.price||22800)} · 永久卡 ${money(plans.find(p=>p.type==='permanent'&&p.scope===chosenScope)?.price||39900)}${plans.find(p=>p.type==='permanent'&&p.scope===chosenScope)?.repurchaseDiscount?'（跨学科复购 8.5 折）':''}。${countSummary}。重复下载不扣额度。</p></div><div class="download-plan-grid">${options.map(({plan,title})=>{
   const upgrade=plan.type==='permanent'&&bestUpgrade(plan.scope),type=plan.type,amount=quota(plan),isTrial=trial(plan),caption=isTrial?'跨学科 · 二选一':type==='count'?`跨学科 · ${amount} 额度`:type==='year'?'单学科 · 365 天':'单学科 · 长期使用';
   return `<article class="download-plan ${type==='year'?'plan-year':''}"><div class="plan-top"><span>${caption}</span><h2>${title}</h2></div><p class="plan-price">${upgrade?`<small>补差价</small> ${money(upgrade.price)}`:money(plan.price)}${offer(plan)?`<del>${money(plan.promotion.originalPrice)}</del>`:!upgrade&&plan.repurchaseDiscount?`<del>${money(plan.repurchaseDiscount.originalPrice)}</del>`:''}<small> / ${type==='count'?'张':type==='year'?'年':'永久'}</small></p>${promotion(plan)}${!upgrade?repurchaseBadge(plan):''}<ul>${isTrial?'<li>2 份独立版或 1 份整合版</li><li>独立版扣 1 额度，整合版扣 2</li><li>已选资源重复下载不扣额度</li><li>不设选用期限</li>':type==='count'?`<li>共 ${amount} 额度，可跨学科混选</li><li>独立版扣 1，整合版扣 2</li><li>每卡最多选 8 份整合版</li><li>剩余额度仍可选独立版</li><li>重复不扣额度，无选用期限</li>`:`<li>${esc(scopes.find(s=>s.id===chosenScope)?.title)}专属下载权限</li><li>${type==='year'?'生效后 365 天内不限次数下载':'不限次数下载该学科资源'}</li><li>含独立版、整合版与后续新增资源</li><li>${type==='year'?'到期后停止新的下载，不自动续费':'一次购买，不自动续费'}</li>`}</ul>${upgrade?upgradeButton(upgrade):`<button class="button wide" data-download-action="checkout" data-id="${plan.id}" ${info.selling?'':'disabled'}>${info.selling?'购买'+title:'暂未开放购买'}</button>`}${upgrade?`<p class="subtle">永久卡 ${money(upgrade.permanentPrice)} − 年卡现价 ${money(upgrade.annualPrice)}</p>`:''}</article>`;
  }).join('')}</div>${allSubjectOffer()}${bestUpgrade(chosenScope)?`<p class="download-upgrade-rule">${esc(upgradeEligibility())} 符合条件的年卡可按“永久卡现价 − 年卡现价”补差价升级。</p>`:''}<p class="download-repurchase-rule">已购买永久卡的用户，再购其他学科永久卡享 8.5 折，登录后自动显示优惠价。不与其他优惠叠加。</p><p class="download-purchase-note">新购尝鲜卡含 2 额度，可选 2 份独立版或 1 份整合版；已选 1 份独立版后，剩余 1 额度只能再选 1 份独立版。本次规则更新前已选过 1 份独立版的尝鲜卡，额外补赠 1 额度；实际余量可在“已解锁课件”查看。98 元次卡共 20 额度，独立版扣 1、整合版扣 2，每张卡最多选 8 份整合版；若已选 8 份整合版且未选独立版，剩余 4 额度仍可选 4 份独立版。独立版与整合版可混合选用，已选资源重复下载不扣额度、不占新的整合版名额。新规则同样适用于已有次卡。年卡和永久卡含对应学科独立版与整合版，按“学段＋学科”划分，初中物理与高中物理分别授权。已购课件包已自动转换为对应学科年卡，可在“已解锁课件”查看有效期。</p><p class="subtle">下载文件保存在您的设备中；年卡到期不会远程删除本地文件。${esc(refundNotice())}<a href="#refunds">退款与售后</a></p>${p?`<a class="text-button" href="#course/${esc(p.id)}">返回资源介绍</a>`:''}</section>`;
 }
 function purchase(id='',popup=false){returnResource=id;if(id){chosenScope=getInfo().downloadScopes?.find(s=>s.productIds.includes(id))?.id||chosenScope;}if(popup){modal(purchaseMarkup(id));document.querySelector('#dialog').classList.add('download-dialog');}else{main().className='download-purchase-page';main().innerHTML=purchaseMarkup(id);}}
 async function checkout(id){
  if(!getUser()){login(id);return;}
  await refresh();const p=getInfo().downloadPlans.find(p=>p.id===id);if(!p)return;
  if(p.allSubjects)return allSubjectCheckout(p);
  const upgrade=p.type==='permanent'&&bestUpgrade(p.scope);if(upgrade)return upgradeCheckout(upgrade.sourceCardId);
  modal(`<div class="dialog-content"><p class="eyebrow">确认下载授权</p><h2>${esc(p.title)}</h2><p class="plan-price">${money(p.price)}${p.repurchaseDiscount?` <del>${money(p.repurchaseDiscount.originalPrice)}</del>`:''}</p>${promotion(p)}${repurchaseBadge(p)}<p>${trial(p)?'本卡含 2 额度，可跨学科选用 2 份独立版或 1 份整合版。独立版消耗 1 额度，整合版消耗 2 额度；已选用 1 份独立版后，余下 1 额度仅可再选 1 份独立版。已选资源重复下载不扣额度，不设选用期限。':p.type==='count'?`本卡共 ${quota(p)} 额度，可跨学科混合选用。独立版消耗 1 额度，整合版消耗 2 额度；每张卡最多选 8 份整合版。若先选 8 份整合版，还剩 4 额度，可继续选 4 份独立版。重复下载已选资源不扣额度、不占新的整合版名额，不设选用期限。`:p.type==='year'?'开通对应学科独立版与整合版 365 天下载权限；已有有效年卡时顺延。':'开通对应学科独立版与整合版永久下载权限。'}</p><p>资源为独立 HTML 文件，仅限您本人教学使用。请先下载免费资源，确认教学电脑能够正常运行。</p><div class="download-refund-notice"><strong>购买前请确认</strong><p>${esc(refundNotice())}</p></div><label class="download-policy-check"><input type="checkbox" id="download-policy-accepted"><span>我已阅读并确认上述数字资源购买及售后说明。</span></label><div class="actions">${getInfo().channels.map(c=>`<button class="button" disabled data-download-action="pay" data-id="${esc(id)}" data-channel="${c}" data-price="${p.price}">${c==='wechat'?'微信支付':'支付宝'}</button>`).join('')}</div><p class="error" id="download-payment-error" role="alert"></p></div>`);
 }
 async function download(id,confirmed=false){
  if(busy)return;const p=product(id);if(!p)return;
  if(!getUser()){toast('请先登录，下载文件将关联您的账号');login();return;}
  await refresh();const fresh=product(id);
   if(!fresh.canDownload){if(unavailable(fresh)){toast('这份资源暂未开放下载');return;}if(fresh.downloadReason==='blocked'){toast('此账号的下载权益已终止，请联系售后');return;}purchase(id,true);return;}
  if(fresh.downloadReason==='count'&&!confirmed){modal(`<div class="dialog-content"><h2>确认选用这份资源</h2><p>${esc(p.title)}</p><p>${esc(countSelectionText(fresh))}</p><button class="button wide" data-download-action="confirm-download" data-id="${esc(id)}">确认选用并下载</button>${warning()}</div>`);return;}
  busy=true;const buttons=[...document.querySelectorAll('[data-download-action="download"],[data-download-action="confirm-download"]')];buttons.forEach(b=>{b.disabled=true;b.dataset.oldLabel=b.textContent;b.textContent='正在准备下载…';});
  try{
   const file=await api('/api/downloads/prepare',{productId:id,confirmSelection:confirmed});
   if(!/^\/api\/downloads\/file\/[A-Za-z0-9_-]+$/.test(file.url))throw Error('下载地址异常，请刷新重试');
   modal(`<div class="dialog-content download-ready"><span class="download-chip">文件已准备</span><h2>${esc(p.title)}</h2><p>点击下方按钮，将 HTML 课件保存到本机。</p><a class="button wide" href="${esc(file.url)}" download="${esc(file.filename)}" data-download-save="${esc(id)}" data-download-expires="${Number(file.expiresAt)}">↓ 保存课件文件</a><p class="subtle" id="download-save-status" role="status">下载链接 5 分钟内有效。首次请求文件时按资源类型扣除相应额度，重复下载不扣额度。</p><p class="subtle"><a class="text-button" href="${esc(file.url+'?direct=1')}" download="${esc(file.filename)}" data-download-save="${esc(id)}" data-download-expires="${Number(file.expiresAt)}">下载未开始？使用备用线路</a></p>${warning()}<button class="text-button" data-download-action="download" data-id="${esc(id)}">重新准备下载</button></div>`);
  }catch(e){toast(e.message);}finally{busy=false;buttons.forEach(b=>{if(b.isConnected){b.disabled=false;b.textContent=b.dataset.oldLabel;}});}
 }
 async function library(){
  main().className='download-library';
  if(!getUser()){main().innerHTML='<h1>已解锁课件</h1><div class="empty"><h2>登录后查看下载权益</h2><button class="button" data-action="login">登录</button></div>';return;}
  const viewer=getUser().id;await refresh();if(getUser()?.id!==viewer)return;const r=await api('/api/library');if(getUser()?.id!==viewer||!['#purchases','#unlocked'].includes(location.hash))return;
  const a=r.account,visible=orderCourses(r.products.filter(p=>!['count','free'].includes(p.downloadReason)||a.unlocked.includes(p.id)));
  const orders=(r.orders||[]).map(o=>`<div class="order-row"><div><h3>${esc(o.title)}</h3><small>${esc(o.id)} · ${date(o.created)}</small></div><div class="order-actions"><span>${money(o.amount)} · ${({paid:'已付款',pending:'待付款',expired:'已过期',refunded:'已退款',payment_review:'待核查',failed:'未完成'})[o.status]||esc(o.status)}</span>${o.status==='pending'?`<button class="button secondary small" data-action="order" data-id="${esc(o.id)}">查看付款</button>`:''}${refundUI.orderMarkup(o)}</div></div>`).join('');
  main().innerHTML=`<header class="library-header"><h1>已解锁课件</h1><a class="button secondary" href="#purchase">购买下载卡</a></header>${a.blocked?'<p class="download-warning">此账号的下载权益已终止，请联系售后。</p>':allSubjectLibraryOffer()}<section class="download-entitlements">${a.cards.map(c=>`<article><span class="download-chip">${c.allSubjectUpgraded?'已升级全科永久卡':c.upgraded?'已升级永久卡':c.legacy?'老用户年卡':c.active?'生效中':c.starts>Date.now()?'待生效':'已到期'}</span><h2>${esc(c.title)}</h2><strong>${c.type==='count'?`剩余 ${c.remaining}${quota(c)?' / '+quota(c):''} 额度`:c.ends?date(c.ends)+' 到期':'永久有效'}</strong>${c.subjects?.length?`<p>${c.subjects.map(s=>esc(s.title)).join(' · ')}</p><p>含所列科目后续新增课件；新科目另购享 8.5 折。</p>`:c.ends?`<p>${date(c.starts)} 开始</p>`:trial(c)?`<p>${esc(trialBalanceText(c))}</p><p>独立版扣 1 额度，整合版扣 2；重复下载不扣额度。</p>`:count20(c)?`<p>${esc(countBalanceText(c))}</p><p>独立版扣 1 额度，整合版扣 2；重复下载不扣额度、不占新的整合版名额。</p>`:'<p>已选资源重复下载不扣额度</p>'}${c.upgrade&&!c.allSubjectUpgraded?`<div class="download-card-upgrade"><p>永久卡 ${money(c.upgrade.permanentPrice)} − 年卡现价 ${money(c.upgrade.annualPrice)}</p>${upgradeButton(c.upgrade)}</div>`:''}${trial(c)&&Number.isSafeInteger(c.bonusQuota)&&c.bonusQuota>0?`<p>规则更新补赠 ${c.bonusQuota} 额度</p>`:''}</article>`).join('')||'<p class="subtle">尚未购买下载卡，可先选择免费资源。</p>'}</section><section><div class="section-top"><h2>可下载的课件</h2><span>${visible.length} 份</span></div>${editionTabs(visible,'all','unlocked-edition')}<div class="download-library-filters"><label>学段<select id="unlocked-stage"><option value="">全部学段</option>${[...new Set(visible.flatMap(p=>p.stages||[]))].map(s=>`<option>${esc(s)}</option>`).join('')}</select></label><label>学科<select id="unlocked-subject"><option value="">全部学科</option>${[...new Set(visible.map(p=>p.subject))].map(s=>`<option>${esc(s)}</option>`).join('')}</select></label></div><div class="grid" id="unlocked-grid">${visible.filter(p=>matchesDownloadEdition(p,'all')).map(card).join('')||'<p class="subtle">尝鲜卡和次卡先到课件库选用资源，已选资源会出现在这里。</p>'}</div></section><section class="library-orders"><h2>订单与退款</h2>${orders||'<p class="subtle">暂无订单。</p>'}</section>`;
  let selectedChapter='',selectedEdition='all',chapters=[];
  const grid=document.querySelector('#unlocked-grid'),layout=document.createElement('div');layout.className='download-library-layout';grid.before(layout);
  const directory=document.createElement('aside');layout.append(directory,grid);
  const renderDirectory=()=>{
   const editionProducts=visible.filter(p=>matchesDownloadEdition(p,selectedEdition));
   chapters=libraryChapters(editionProducts,selectedEdition!=='standalone'?[]:getInfo().curriculum?.chapters||[]);
   const groups=new Map();for(const ch of chapters){const key=ch.domain||ch.subject;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(ch);}
   directory.innerHTML=`<details class="download-directory" ${matchMedia('(min-width:901px)').matches?'open':''}><summary>${selectedEdition.endsWith('integrated')?'整合版目录':'章节目录'}</summary><button data-unlocked-chapter="" class="selected">全部${selectedEdition.endsWith('integrated')?'整合版':'独立版'}</button>${[...groups].map(([name,items])=>`<details><summary>${esc(name)}</summary>${items.map(ch=>`<button data-unlocked-chapter="${esc(ch.id)}">${esc(ch.title)} <small>${ch.ids.length}</small></button>`).join('')}</details>`).join('')}</details>`;
  };
  const redraw=()=>{const stage=document.querySelector('#unlocked-stage').value,subject=document.querySelector('#unlocked-subject').value,chapter=chapters.find(ch=>ch.id===selectedChapter);document.querySelector('#unlocked-grid').innerHTML=visible.filter(p=>matchesDownloadEdition(p,selectedEdition)&&(!stage||p.stages.includes(stage))&&(!subject||p.subject===subject)&&(!chapter||chapter.ids.includes(p.id))).map(card).join('')||'<p class="subtle">当前筛选下暂无已解锁资源。</p>';};
  renderDirectory();
  document.querySelector('.download-library .download-edition-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-action="unlocked-edition"]');if(!b)return;selectedEdition=validDownloadEdition(b.dataset.value);selectedChapter='';document.querySelectorAll('[data-action="unlocked-edition"]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));renderDirectory();redraw();});
  directory.addEventListener('click',e=>{const b=e.target.closest('[data-unlocked-chapter]');if(!b)return;selectedChapter=b.dataset.unlockedChapter;directory.querySelectorAll('[data-unlocked-chapter]').forEach(el=>el.classList.toggle('selected',el===b));redraw();if(matchMedia('(max-width:900px)').matches)directory.querySelector('.download-directory').open=false;});
  document.querySelector('#unlocked-stage').addEventListener('change',redraw);document.querySelector('#unlocked-subject').addEventListener('change',redraw);
 }
 function traceForm(){modal(`<form id="download-trace-form" class="form"><h2>下载资源核查</h2><label>选择待核查的 HTML 文件<input type="file" accept=".html,.htm" name="resource" required></label><p class="subtle">只读取文件中的授权标记，不运行其中代码。匹配记录仅作为核查线索。</p><button class="button">核查来源</button><div id="download-trace-result"></div></form>`);}
 document.addEventListener('click',async e=>{
  const save=e.target.closest('[data-download-save]');
  if(save){
   const expires=Number(save.dataset.downloadExpires);
   if(!Number.isFinite(expires)||Date.now()>=expires){e.preventDefault();toast('链接已过期，请点击“重新准备下载”');return;}
   const status=document.querySelector('#download-save-status');if(status)status.textContent='已向浏览器请求保存，请检查下载列表。若未开始，可在链接有效期内再次点击重试，重复下载不扣次数。';
   setTimeout(()=>refresh().catch(()=>{}),1500);return;
  }
  const b=e.target.closest('[data-download-action]');if(!b)return;e.preventDefault();
  try{const {downloadAction:action,id,channel}=b.dataset;
   if(action==='download'||action==='confirm-download')await download(id,action==='confirm-download');
   if(action==='checkout')await checkout(id);
   if(action==='upgrade')await upgradeCheckout(id);
   if(action==='scope'){chosenScope=id;b.closest('.download-purchase').outerHTML=purchaseMarkup(returnResource);}
   if(action==='trace')traceForm();
   if(action==='block')modal(`<form id="download-block-form" class="form" data-user="${Number(id)}"><h2>核实后终止账号权益</h2><p>处理账号：${esc(b.dataset.username)}</p><p>确认后将退出该账号的当前登录，并永久停止其全部下载权益。历史订单与核查记录保留。</p><label>核实结果与处理原因<textarea name="reason" required minlength="8" maxlength="500" rows="4"></textarea></label><label><input type="checkbox" name="confirmed" required> 我已核实传播证据，确认处理此账号</label><button class="button">确认永久停用</button></form>`);
   if(action==='covers')modal('<form id="resource-covers-form" class="form"><h2>更新独立资源封面</h2><label>封面清单文件<input type="file" name="covers" accept=".json" required></label><p class="subtle">原封面会先备份，再更新清单中对应资源的图片。</p><button class="button">上传并更新封面</button><p id="resource-cover-result" role="status"></p></form>');
   if(action==='pay'){if(!document.querySelector('#download-policy-accepted')?.checked)throw Error('请先阅读并确认购买及售后说明');b.disabled=true;const p=getInfo().downloadPlans.find(p=>p.id===id);try{showPayment(await api('/api/orders',{productId:id,channel:Number(b.dataset.price)===0&&p?.allSubjectUpgrade?'credit':channel,expectedAmount:Number(b.dataset.price),...(b.dataset.sourceCard?{sourceCardId:b.dataset.sourceCard}:{}),mobile:matchMedia('(max-width:760px)').matches,refundPolicyAccepted:true,refundPolicyVersion:getInfo().downloadRefundPolicyVersion}));}catch(err){if(err.code==='DOWNLOAD_PRICE_CHANGED'){if(b.dataset.sourceCard)await upgradeCheckout(b.dataset.sourceCard);else await checkout(id);toast('报价已更新，请确认当前金额后再付款');}else throw err;}finally{b.disabled=false;}}
  }catch(e){toast(e.message);}
 });
 document.addEventListener('change',e=>{if(e.target.id==='download-policy-accepted')document.querySelectorAll('[data-download-action=pay]').forEach(b=>b.disabled=!e.target.checked);});
 document.addEventListener('submit',async e=>{
  if(e.target.id==='download-block-form'){
   e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;
   try{await api('/api/admin/download-block',{userId:Number(f.dataset.user),reason:f.elements.reason.value,confirmed:f.elements.confirmed.checked});close();toast('该账号的下载权益已终止');}catch(err){toast(err.message);}finally{b.disabled=false;}return;
  }
  if(e.target.id==='resource-covers-form'){
   e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;
   try{
    const file=f.elements.covers.files[0];if(!file||file.size>32*1024*1024)throw Error('封面清单过大');
    const payload=JSON.parse(await file.text());if(!Array.isArray(payload.covers)||payload.covers.length>500)throw Error('封面清单格式不正确');
    let batch=[],bytes=0,completed=0;
    const send=async()=>{if(!batch.length)return;const result=await api('/api/admin/resource-covers',{covers:batch});completed+=result.count;document.querySelector('#resource-cover-result').textContent=`已更新 ${completed} / ${payload.covers.length} 份课件封面`;batch=[];bytes=0;};
    for(const item of payload.covers){if(batch.length&&(batch.length>=10||bytes+item.data.length>650000))await send();batch.push(item);bytes+=item.data.length;}
    await send();document.querySelector('#resource-cover-result').textContent=`已更新 ${completed} 份课件封面`;await refresh();
   }catch(err){toast(err.message);}finally{b.disabled=false;}return;
  }
  if(e.target.id!=='download-trace-form')return;e.preventDefault();const f=e.target;
  try{const file=f.elements.resource.files[0];if(!file||file.size>100*1024*1024)throw Error('请选择小于 100 MB 的 HTML 文件');
   const source=await file.text();let marker=source.match(/name="resource-revision" content="([a-f0-9]{64})"/)?.[1];
   if(!marker){const encoded=source.match(/layout-check:([A-Za-z0-9+/=]+)/)?.[1]||source.match(/--resource-layout:([A-Za-z0-9+/=]+)/)?.[1];if(encoded)marker=[...atob(encoded)].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');}
   if(!marker)throw Error('未识别到完整指纹，不能据此判定来源');
   const {record:r}=await api('/api/admin/download-trace',{fingerprint:marker});document.querySelector('#download-trace-result').innerHTML=`<p>账号：${esc(r.username)}<br>资源：${esc(product(r.product_id)?.title||r.product_id)}<br>下载时间：${esc(new Date(r.created).toLocaleString('zh-CN'))}</p><p class="subtle">请结合传播证据人工核实。此结果不会自动封禁账号。</p><button type="button" class="button secondary" data-download-action="block" data-id="${Number(r.user_id)}" data-username="${esc(r.username)}">核实后处理账号</button>`;
  }catch(err){toast(err.message);}
 });
 document.querySelector('#dialog').addEventListener('close',()=>document.querySelector('#dialog').classList.remove('download-dialog'));
 function refreshPricing(){
  const payment=document.querySelector('[data-download-action=pay]');
  if(payment&&getInfo().downloadPlans?.find(p=>p.id===payment.dataset.id)?.type==='year')return checkout(payment.dataset.id);
  const panel=document.querySelector('.download-purchase');if(panel)panel.outerHTML=purchaseMarkup(returnResource);
 }
 return {card,detail,purchase,checkout,upgradeCheckout,library,warning,refreshPricing,editionTabs};
}
