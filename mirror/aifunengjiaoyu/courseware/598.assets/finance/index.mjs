const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const beijing=value=>value?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'原规则';
function styles(){if(document.querySelector('#finance-style'))return;const s=document.createElement('style');s.id='finance-style';s.textContent='.finance-box{border:1px solid #dbe5ef;background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;min-width:0}.finance-box h4{margin:0 0 8px}.finance-form{display:flex;flex-wrap:wrap;align-items:end;gap:12px}.finance-form label{display:flex;flex-direction:column;gap:6px;font-size:13px;max-width:100%;min-width:0}.finance-form input{box-sizing:border-box;padding:9px;border:1px solid #cbd5e1;border-radius:8px;max-width:100%;font:inherit}.finance-box p,.finance-box li{font-size:13px;line-height:1.7;overflow-wrap:anywhere}.finance-box details{margin-top:12px}.finance-form .finance-confirm{flex-direction:row;align-items:start;width:100%}.finance-box [role=status]{min-height:22px}.finance-box [data-error=true]{color:#b91c1c}@media(max-width:600px){.finance-form>label{width:100%}.finance-form input{width:100%}.finance-form input[type=checkbox]{width:auto}.finance-box{padding:12px}}';document.head.append(s);}
function api(token){return async(path,method='GET',body)=>{const response=await fetch('/api/admin/finance/'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await response.json();if(!response.ok||!data.success)throw Error(data.msg||'操作失败');return data;};}
export function mountShares(root,{token}) {
  styles();const call=api(token);let current,busy=false;
  root.className='finance-box';
  const message=(text,error=false)=>{if(root.isConnected){root.querySelector('[role=status]').textContent=text;root.querySelector('[role=status]').dataset.error=String(error);}};
  async function load(){
    root.innerHTML='<h4>新订单分成设置</h4><p role="status">正在读取比例…</p>';
    try{const data=await call('share-policy');if(!root.isConnected)return;current=data.current;
      root.innerHTML=`<h4>新订单分成设置</h4><p>当前：教师 <strong>${current.teacher_bps/100}%</strong> · 平台 <strong>${(10000-current.teacher_bps)/100}%</strong><br>生效时间（北京）：${esc(beijing(current.effective_at))}</p><p>保存成功后立即用于新创建的课件、资源订单。此前创建的订单（包括尚未付款）及历史收益保留原规则。</p><details><summary>调整比例</summary><form class="finance-form"><label>教师比例（%）<input name="percent" type="number" min="0" max="100" step="0.01" value="${current.id===0?85:current.teacher_bps/100}" required></label><label>调整说明<input name="note" maxlength="300" required placeholder="例如：平台服务费调整"></label><label class="finance-confirm"><input type="checkbox" name="confirm" required>确认仅用于保存成功后新创建的订单</label><button class="btn btn-primary" type="submit">保存并立即生效</button></form></details><p role="status"></p><details><summary>最近修改记录（${data.history.length}条，最多50条）</summary><ul>${data.history.map(p=>`<li>${esc(beijing(p.effective_at))} · 教师 ${p.previous_bps/100}% → ${p.teacher_bps/100}% · 操作者 ${esc(p.actor)}<br>${esc(p.note)}</li>`).join('')||'<li>尚未调整，沿用历史95%规则。</li>'}</ul></details>`;
      root.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;const form=e.target,percent=form.elements.percent.value;
        if(!/^\d{1,3}(?:\.\d{1,2})?$/.test(percent)||Number(percent)>100)return message('比例需在0%至100%之间，最多两位小数',true);
        busy=true;const button=form.querySelector('button');button.disabled=true;
        try{await call('share-policy','PUT',{version:current.id,teacherBps:Math.round(Number(percent)*100),note:form.elements.note.value,confirmNewOrdersOnly:form.elements.confirm.checked});await load();message('已保存，新建订单采用新比例；历史订单及收益保持原规则。');}
        catch(error){message(error.message+'；可刷新本页重新读取当前比例。',true);}
        finally{busy=false;button.disabled=false;}
      };
    }catch(error){message(error.message,true);}
  }
  load();
}
export function mountExport(root,{token}) {
  styles();root.className='finance-box';let downloading=false,url,timer;
  const month=new Date(Date.now()+8*3600000).toISOString().slice(0,7);
  root.innerHTML=`<h4>月度订单对账</h4><p>覆盖全部类型的付费订单。收款按付款日期、退款按完成退款日期计入所选月份；与上方订单筛选独立。文件包含发票状态和各收款商户汇总。</p><form class="finance-form"><label>统计月份（北京）<input name="month" type="month" value="${month}" required></label><label>分段开始（选填）<input name="from" type="date"></label><label>分段结束（选填）<input name="to" type="date"></label><button class="btn btn-outline" type="submit">导出月度 Excel</button></form><p role="status"></p><p>每份最多5000笔，超出时可按日期分段导出。收款减退款不等于利润或银行到账。</p>`;
  const form=root.querySelector('form'),line=root.querySelector('[role=status]');
  form.elements.month.onchange=()=>{form.elements.from.value='';form.elements.to.value='';};
  form.onsubmit=async e=>{e.preventDefault();if(downloading)return;downloading=true;const button=form.querySelector('button');button.disabled=true;line.textContent='正在生成完整对账文件…';line.dataset.error='false';
    try{const query=new URLSearchParams(new FormData(form));const response=await fetch('/api/admin/finance/orders-export?'+query,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      if(!response.ok)throw Error((await response.json()).msg||'导出失败');const blob=await response.blob();if(!root.isConnected)return;
      if(url)URL.revokeObjectURL(url);clearTimeout(timer);url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download='订单对账-'+query.get('month')+'.xlsx';link.textContent='点击保存 Excel';line.replaceChildren(document.createTextNode('已生成，'),link);link.click();
      timer=setTimeout(()=>{URL.revokeObjectURL(url);link.remove();},300000);
    }catch(error){line.textContent=error.message;line.dataset.error='true';}finally{downloading=false;button.disabled=false;}
  };
}
