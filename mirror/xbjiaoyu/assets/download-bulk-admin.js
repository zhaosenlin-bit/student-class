const defined=(...values)=>values.find(value=>value!==undefined&&value!==null&&value!=='');
const array=value=>Array.isArray(value)?value:[];
const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const timestamp=value=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&value?(/^\d{12,14}$/.test(value)?Number(value):Date.parse(value)):NaN;
export function bulkEvidenceTime(value){const time=timestamp(value),date=new Date(time+8*3600000);return Number.isFinite(time)&&Number.isFinite(date.getTime())?date.toISOString().slice(0,23).replace('T',' '):'—';}
export function normalizeBulkRecord(record={}){
 const account=record.account||record.user||{};
 const orders=array(record.sourceOrders);
 return {raw:record,id:defined(record.id,record.jobId,record.job_id),phone:defined(record.phoneMasked,account.phoneMasked,record.phone_masked),username:defined(record.username,account.username),userId:defined(record.userId,account.id),scopeId:defined(record.scopeId,record.scope?.id,record.scope_id),scopeTitle:defined(record.scopeTitle,record.scope?.title,record.title,record.scopeId),orders,orderId:defined(record.orderId,record.sourceOrder,record.source_order,record.order?.id,record.order_id,orders.map(o=>o.id).filter(Boolean).join('；')),confirmedAt:defined(record.confirmedAt,record.confirmationAt,record.acceptedAt,record.confirmed_at),firstGetAt:defined(record.firstGetAt,record.firstDownloadAt,record.deliveryStartedAt,record.first_get_at),fileCount:defined(number(record.fileCount),number(record.totalFiles),number(record.count),number(record.manifestCount),number(record.total)),status:record.status,transferStatus:defined(record.transferStatus,record.deliveryStatus,record.transfer_status),createdAt:defined(record.createdAt,record.created),policyVersion:defined(record.policyVersion,record.policy_version),sha256:defined(record.sha256,record.archiveSha256,record.packageSha256),bytes:defined(number(record.bytes),number(record.archiveSize),number(record.archiveBytes),number(record.packageBytes),number(record.size)),filename:defined(record.filename,record.archiveFilename),transferCount:number(record.transferCount),completedTransfers:number(record.completedTransfers),interruptedTransfers:number(record.interruptedTransfers),startedTransfers:number(record.startedTransfers),totalSentBytes:number(record.totalSentBytes)};
}
export function normalizeBulkDetail(detail={}){
 const record=normalizeBulkRecord(detail.record||detail.job||{}),manifest=detail.manifest||{};
 const files=array(Array.isArray(manifest)?manifest:manifest.files||manifest.items||detail.files).map(file=>({...file,courseId:defined(file.courseId,file.productId,file.id),title:defined(file.title,file.courseTitle,file.name),path:defined(file.path,file.zipPath,file.archivePath,file.filename),bytes:defined(number(file.bytes),number(file.size)),sha256:defined(file.sha256,file.fileSha256)}));
 const attempts=array(detail.attempts||detail.transfers).map(item=>({...item,id:defined(item.id,item.attemptId),method:defined(item.method,item.httpMethod),startedAt:defined(item.startedAt,item.started,item.startAt,item.createdAt),finishedAt:defined(item.finishedAt,item.endedAt,item.completedAt,item.finished),bytesSent:defined(number(item.bytesSent),number(item.sentBytes),number(item.bytes_sent)),range:item.range===null?null:defined(item.range,item.rangeHeader,item.requestRange),status:defined(item.status,item.transferStatus),interrupted:typeof item.interrupted==='boolean'?item.interrupted:null,completed:typeof item.completed==='boolean'?item.completed:null,httpStatus:defined(item.httpStatus,item.statusCode)}));
 const policy=detail.policy||{};
 const orders=array(detail.orders||record.orders),refundItems=detail.refunds||detail.refundRequests||detail.refundRelations||orders.filter(o=>o.refund).map(o=>({...o.refund,orderId:o.id}));
 const refunds=array(refundItems).map(item=>({...item,id:defined(item.id,item.refundId),orderId:defined(item.orderId,item.order_id),applicationAt:defined(item.applicationAt,item.requestedAt,item.createdAt,item.created,item.appliedAt),status:item.status}));
 return {raw:detail,record,files,attempts,refunds,orders,policy:{...policy,version:defined(policy.version,policy.policyVersion,record.policyVersion),notice:defined(policy.notice,policy.text,policy.confirmationText,detail.notice,record.raw.notice),confirmed:defined(policy.confirmed,record.raw.confirmed,record.raw.accepted)},sha256:defined(record.sha256,manifest.sha256,manifest.archiveSha256),bytes:defined(record.bytes,number(manifest.bytes),number(manifest.archiveBytes)),filename:defined(record.filename,manifest.filename),fileCount:record.fileCount??files.length};
}
export function bulkRefundRelation(start,refund){const a=timestamp(start),b=timestamp(refund?.applicationAt);if(!Number.isFinite(a)||!Number.isFinite(b))return '时间未记录，无法比较';return a<b?'传输开始于申请退款前':a>b?'传输开始于申请退款后':'传输开始与申请退款同一毫秒';}
const csvCell=value=>{const string=String(value??'');return '"'+(/^[=+\-@\t\r]/.test(string)?"'":'')+string.replaceAll('"','""')+'"';};
const csv=rows=>'\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
export function bulkManifestCsv(detail){const d=normalizeBulkDetail(detail);return csv([['下载包编号','账号','科目','关联订单','确认时间_北京时间','确认时间_原值','政策版本','下载包SHA256','下载包字节','序号','课件编号','课件名称','版本','包内路径','交付记录编号','文件关联指纹','下载卡编号','课件关联订单','文件字节','文件SHA256'],...d.files.map((f,index)=>[d.record.id,d.record.phone||d.record.username,d.record.scopeTitle,d.record.orderId,bulkEvidenceTime(d.record.confirmedAt),d.record.confirmedAt,d.policy.version,d.sha256,d.bytes,f.index??index+1,f.courseId,f.title,f.version,f.path,f.recordId,f.fingerprint,f.cardId,f.orderId,f.bytes,f.sha256])]);}
export function bulkRange(value){return value&&typeof value==='object'?Number.isSafeInteger(value.start)&&Number.isSafeInteger(value.end)?`bytes=${value.start}-${value.end}`:JSON.stringify(value):String(value??'');}
export function bulkAttemptsCsv(detail){const d=normalizeBulkDetail(detail);return csv([['下载包编号','关联订单','传输编号','请求方式','开始时间_北京时间','结束时间_北京时间','开始时间_原值','结束时间_原值','传输状态','是否中断','服务端发送字节','Range','HTTP状态','与关联退款申请关系'],...d.attempts.map(a=>[d.record.id,d.record.orderId,a.id,a.method,bulkEvidenceTime(a.startedAt),bulkEvidenceTime(a.finishedAt),a.startedAt,a.finishedAt,a.status,a.interrupted===null?(a.status==='interrupted'?'是':a.status==='completed'?'否':''):a.interrupted?'是':'否',a.bytesSent,bulkRange(a.range),a.httpStatus,d.refunds.map(r=>`退款申请 ${r.id??''}：${bulkRefundRelation(a.startedAt,r)}`).join('；')])]);}

const prepareLabels={queued:'等待整理',building:'正在整理',ready:'下载包已准备',failed:'准备失败',expired:'已过期',delivery_started:'已开始交付'};
const transferLabels={none:'未开始传输',not_started:'未开始传输',started:'开始已记录，结束状态未记录',streaming:'传输中',sending:'传输中',completed:'服务端传输完成',finished:'服务端传输完成',interrupted:'传输中断',aborted:'传输中断',failed:'传输失败',partial:'部分传输',mixed:'存在多次传输'};
export function createDownloadBulkAdmin({api,esc,getUser,main,toast,location:loc=globalThis.location,document:doc=globalThis.document,saveFile}){
 let serial=0,query='',loaded=null;
 const route=()=>loc.hash.split('/')[0]==='#bulk-download-admin';
 const permitted=()=>getUser()?.role==='owner';
 const current=(token,user)=>token===serial&&getUser()?.id===user&&permitted()&&route();
 const value=text=>esc(text??'—');
 const bytes=n=>typeof n==='number'?`${n.toLocaleString('zh-CN')} 字节`:'—';
 const time=n=>value(bulkEvidenceTime(n));
 const title=()=>`<header class="bulk-admin-heading"><div><p class="eyebrow">下载与售后核查</p><h1>整科下载记录</h1><p>查看逐次确认、课件清单与实际传输记录。</p></div><a class="button secondary small" href="#admin">返回管理</a></header>`;
 const note=()=>'<p class="bulk-admin-evidence-note">服务端传输完成不等于已保存到用户电脑。准备下载包与 HEAD 请求不计为下载；实际 GET 传输、未完成及中断情况分别列示。</p>';
 function inaccessible(){main().className='bulk-admin-page';main().innerHTML=title()+'<div class="bulk-admin-empty"><h2>请使用管理员账号查看</h2><p>下载与售后记录仅管理员可查看。</p><button class="button" data-action="owner-login">管理员登录</button></div>';}
 const search=()=>`<form class="bulk-admin-search" data-bulk-admin-search><label for="bulk-admin-query">查找账号或订单</label><div><input id="bulk-admin-query" name="q" type="search" placeholder="手机号尾号、用户名或订单号" value="${esc(query)}" maxlength="100"><button class="button" type="submit">查询</button>${query?'<button class="button secondary" type="button" data-bulk-admin-action="clear">清除</button>':''}</div></form>`;
 const tableStatus=r=>r.transferStatus?transferLabels[r.transferStatus]||r.transferStatus:r.transferCount!==null?`${r.completedTransfers??0} 次完成 · ${r.interruptedTransfers??0} 次中断${r.startedTransfers?' · '+r.startedTransfers+' 次结束状态未记录':''}`:r.firstGetAt?'已记录 GET 传输':'尚无 GET 传输记录';
 async function render(id=''){
  const token=++serial,user=getUser()?.id;loaded=null;if(!permitted()){inaccessible();return;}
  main().className='bulk-admin-page';main().innerHTML=title()+(id?'':search())+'<div class="bulk-admin-loading" role="status">正在读取真实记录…</div>';
  try{
   const result=await api('/api/admin/download-bulk-records'+(id?'/'+encodeURIComponent(id):'?q='+encodeURIComponent(query)));
   if(!current(token,user))return;
   if(id){loaded=result;renderDetail(result);}else renderList(array(result.records));
  }catch(error){if(current(token,user))main().innerHTML=title()+(id?'<a class="bulk-admin-back" href="#bulk-download-admin">← 返回记录</a>':search())+`<div class="bulk-admin-empty"><h2>暂时无法读取记录</h2><p>${esc(error.message)}</p><button type="button" class="button secondary" data-bulk-admin-action="reload">重新读取</button></div>`;}
 }
 function renderList(records){
  const rows=records.map(normalizeBulkRecord);
  main().innerHTML=title()+search()+note()+`<div class="bulk-admin-list-head"><h2>${query?'查询结果':'最近的整科下载'}</h2><span>${rows.length} 条记录</span><button type="button" class="text-button" data-bulk-admin-action="reload">刷新</button></div>`+(rows.length?`<div class="bulk-admin-table-wrap"><table class="bulk-admin-table"><thead><tr><th>账号 / 订单</th><th>科目 / 课件数</th><th>勾选确认时间</th><th>首次 GET 时间</th><th>传输状态</th><th>明细</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${value(r.phone||r.username)}</strong>${r.phone&&r.username?`<small>${value(r.username)}</small>`:''}<small class="bulk-admin-code">${value(r.orderId)}</small></td><td><strong>${value(r.scopeTitle)}</strong><small>${r.fileCount===undefined?'份数未记录':value(r.fileCount)+' 份课件'} · ${value(prepareLabels[r.status]||r.status)}</small></td><td class="bulk-admin-time">${time(r.confirmedAt)}</td><td class="bulk-admin-time">${time(r.firstGetAt)}</td><td><span class="bulk-admin-status">${value(tableStatus(r))}</span></td><td>${r.id?`<a class="text-button" href="#bulk-download-admin/${encodeURIComponent(r.id)}">查看完整记录 →</a>`:'编号未记录'}</td></tr>`).join('')}</tbody></table></div>`:`<div class="bulk-admin-empty"><span aria-hidden="true">⌁</span><h2>${query?'没有找到匹配记录':'暂无整科下载记录'}</h2><p>${query?'请检查手机号尾号、用户名或订单号，也可清除查询查看全部记录。':'用户确认并开始实际 GET 下载后，记录会出现在这里；只准备下载包不会出现在本列表。'}</p></div>`);
 }
 const pair=(label,text,code=false)=>`<div><dt>${label}</dt><dd${code?' class="bulk-admin-code"':''}>${text}</dd></div>`;
 function attemptStatus(attempt){if(attempt.interrupted===true)return '传输中断';if(attempt.completed===true)return '服务端传输完成';return transferLabels[attempt.status]||attempt.status||'未记录';}
 function orderSection(d){
  if(!d.orders.length)return '';
  const status={paid:'已付款',refunded:'已退款',pending:'待付款',approved:'已同意退款',rejected:'退款已拒绝'};
  return '<section class="bulk-admin-card"><h2>关联订单与退款申请</h2><div class="bulk-admin-order-list">'+d.orders.map(order=>'<article><dl class="bulk-admin-facts">'+pair('订单编号',value(order.id),true)+pair('订单状态',value(status[order.status]||order.status))+pair('订单金额',typeof order.amount==='number'?'¥'+(order.amount/100).toFixed(2):'—')+pair('付款时间',time(order.paidAt))+(order.refund?pair('退款申请编号',value(order.refund.id))+pair('申请退款时间',time(order.refund.created))+pair('退款审核状态',value(status[order.refund.status]||order.refund.status))+pair('审核时间',time(order.refund.reviewedAt)):'')+'</dl></article>').join('')+'</div></section>';
 }
 function attemptsSection(d){
  return '<section class="bulk-admin-card"><div class="bulk-admin-card-heading"><h2>实际传输记录</h2><span>'+d.attempts.length+' 次</span></div>'+(d.attempts.length?'<div class="bulk-admin-attempts">'+d.attempts.map((a,index)=>{
   const interrupted=a.interrupted===null?(a.status==='interrupted'?'是':a.status==='completed'?'否':'结束状态未记录'):a.interrupted?'是':'否';
   const range=a.range===null?'完整文件（无 Range）':bulkRange(a.range)||'未记录';
   return '<article class="bulk-admin-attempt"><header><strong>第 '+(index+1)+' 次 · '+value(a.method||'实际 GET 传输')+'</strong><span class="bulk-admin-status">'+value(attemptStatus(a))+'</span></header><dl class="bulk-admin-facts">'+pair('传输编号',value(a.id),true)+pair('开始时间',time(a.startedAt))+pair('结束时间',time(a.finishedAt))+pair('是否中断',interrupted)+pair('服务端发送字节',bytes(a.bytesSent))+pair('Range',value(range),true)+(a.httpStatus?pair('HTTP 状态',value(a.httpStatus)):'')+'</dl><div class="bulk-admin-refund-relations">'+(d.refunds.length?d.refunds.map(refund=>'<p><strong>'+value(bulkRefundRelation(a.startedAt,refund))+'</strong><span>申请退款：'+time(refund.applicationAt)+' · '+value(refund.id)+'</span><span>关联订单：'+value(refund.orderId)+'</span></p>').join(''):'<p>暂无关联退款申请记录。</p>')+'</div></article>';
  }).join('')+'</div>':'<p class="bulk-admin-subtle">尚无实际 GET 传输记录。准备下载包不代表用户已开始下载。</p>')+'</section>';
 }
 function manifestSection(d){
  return '<section class="bulk-admin-card"><details class="bulk-admin-manifest"><summary><span><strong>完整课件清单</strong><small>共 '+d.files.length+' 条，按下载包当时的清单保存</small></span><span aria-hidden="true">⌄</span></summary>'+(d.files.length?'<div class="bulk-admin-table-wrap"><table class="bulk-admin-table bulk-admin-manifest-table"><thead><tr><th>序号</th><th>课件 / 版本</th><th>包内路径</th><th>交付记录</th></tr></thead><tbody>'+d.files.map((file,index)=>'<tr><td>'+(index+1)+'</td><td><strong>'+value(file.title)+'</strong><small>'+value(file.version)+'</small><small class="bulk-admin-code">'+value(file.courseId)+'</small></td><td class="bulk-admin-code">'+value(file.path)+'</td><td class="bulk-admin-code">'+value(file.recordId)+'<small>文件关联指纹：'+value(file.fingerprint)+'</small><small>关联订单：'+value(file.orderId)+'</small></td></tr>').join('')+'</tbody></table></div>':'<p class="bulk-admin-subtle">尚未记录清单。</p>')+'</details></section>';
 }
 function renderDetail(raw){
  const d=normalizeBulkDetail(raw),r=d.record;
  const status=prepareLabels[r.status]||r.status||(r.confirmedAt?'已记录下载确认':'准备状态未记录');
  main().innerHTML=title()+'<a class="bulk-admin-back" href="#bulk-download-admin">← 返回记录</a><section class="bulk-admin-record-head"><div><span class="bulk-admin-status">'+value(status)+'</span><h2>'+value(r.scopeTitle)+'</h2><p>'+value(r.phone||r.username)+' · '+d.fileCount+' 份课件</p><small class="bulk-admin-code">'+value(r.id)+'</small></div><div class="bulk-admin-export"><button type="button" class="button secondary small" data-bulk-admin-action="json">导出完整记录 JSON</button><button type="button" class="button secondary small" data-bulk-admin-action="manifest-csv" '+(d.files.length?'':'disabled')+'>导出课件清单 CSV</button><button type="button" class="button secondary small" data-bulk-admin-action="attempts-csv" '+(d.attempts.length?'':'disabled')+'>导出传输明细 CSV</button></div></section>'+note()+'<section class="bulk-admin-card"><h2>确认与下载包</h2><dl class="bulk-admin-facts">'+pair('关联订单',value(r.orderId),true)+pair('账号',value(r.phone||r.username))+pair('勾选确认时间',time(r.confirmedAt||d.policy.confirmedAt))+pair('首次 GET 时间',time(r.firstGetAt))+pair('政策版本',value(d.policy.version),true)+pair('下载包大小',bytes(d.bytes))+pair('文件名称',value(d.filename),true)+pair('下载包 SHA256',value(d.sha256),true)+(r.totalSentBytes!==null?pair('历次累计服务端发送',bytes(r.totalSentBytes)):'')+'</dl><div class="bulk-admin-policy"><h3>当时确认的完整文案</h3><p>'+value(d.policy.notice||'未记录确认文案')+'</p></div></section>'+orderSection(d)+attemptsSection(d)+manifestSection(d);
 }
 function download(text,type,filename){
  if(saveFile){saveFile({text,type,filename});return;}
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),link=doc.createElement('a');link.href=url;link.download=filename;doc.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 doc.addEventListener('submit',event=>{if(!event.target.matches('[data-bulk-admin-search]'))return;event.preventDefault();if(!permitted()||!route())return;query=String(event.target.querySelector('[name="q"]')?.value||'').trim();render();});
 doc.addEventListener('click',event=>{
  const button=event.target.closest('[data-bulk-admin-action]');if(!button)return;event.preventDefault();if(button.disabled||!permitted()||!route())return;
  const action=button.dataset.bulkAdminAction;
  if(action==='clear'){query='';render();return;}
  if(action==='reload'){render(loc.hash.split('/')[1]||'');return;}
  if(!loaded){toast('请先打开需要导出的真实记录');return;}
  const d=normalizeBulkDetail(loaded),name='整科下载记录_'+String(d.record.id||'详情').replace(/[^\w-]/g,'_');
  if(action==='json')download(JSON.stringify(loaded,null,2),'application/json;charset=utf-8',name+'.json');
  else if(action==='manifest-csv')download(bulkManifestCsv(loaded),'text/csv;charset=utf-8',name+'_课件清单.csv');
  else if(action==='attempts-csv')download(bulkAttemptsCsv(loaded),'text/csv;charset=utf-8',name+'_传输明细.csv');
 });
 return {render};
}
