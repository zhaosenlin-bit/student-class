// Normal autosaves stay silent. Keep actionable failures visible until recovery.
export function createStatusNotice(document){
 const panel=document.createElement('aside'),text=document.createElement('span'),retry=document.createElement('button');
 panel.hidden=true;panel.dataset.i18nIgnore='';panel.setAttribute('role','status');
 panel.style.cssText='position:fixed;bottom:12px;left:12px;max-width:calc(100% - 24px);background:#15242ce8;color:white;padding:10px;border-radius:8px;z-index:99999;font:14px sans-serif';
 retry.type='button';retry.textContent='重试保存';retry.hidden=true;retry.style.marginLeft='8px';
 panel.append(text,retry);document.body.append(panel);
 let recover=null,failure=null;
 const normal=new Set(['initializing','dirty','saving','saved','chapter-ready','atlas-ready','scripts-loaded','bridge-ready','ready']);
 const retryable=new Set(['save-failed','SAVE_FAILED']);
 const uncertain=new Set(['TIMEOUT','OUTCOME_UNKNOWN','RECONCILE_REQUIRED']);
 function render(){
  panel.hidden=!failure;retry.hidden=!recover||!retryable.has(failure);
  const message=!failure?'':uncertain.has(failure)?'保存结果尚未确认，请在课件外的保存提示中核对后再退出。':retryable.has(failure)?'进度未能保存，请重试并确认成功后再退出。':'课件连接或加载中断，请关闭预览后重新打开。已确认的进度仍保留。';
  if(text.textContent!==message)text.textContent=message;
 }
 function report(value){
  document.body.dataset.courseAdapterState=value;
  if(value==='saved'&&retryable.has(failure))failure=null;
  else if(!normal.has(value))failure=value;
  render();
 }
 retry.onclick=async()=>{if(!recover||!retryable.has(failure))return;retry.disabled=true;try{await recover();}catch(error){report(error.message);}finally{retry.disabled=false;}};
 return {report,setRetry(fn){recover=fn;render();}};
}
