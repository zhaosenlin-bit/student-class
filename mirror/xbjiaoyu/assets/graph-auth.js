export function createGraphChallenge(){
  let stop=null;
  function cancel(){stop?.();}
  function verify(settings,form){
    cancel();
    if(!settings?.required)return Promise.resolve(null);
    if(!settings.ready||!settings.appId)return Promise.reject(Error('安全验证暂不可用，请稍后重试'));
    return new Promise((resolve,reject)=>{
      const nonce=crypto.randomUUID(),panel=document.createElement('dialog'),frame=document.createElement('iframe');
      panel.className='graph-verification';panel.setAttribute('aria-label','图形安全验证');
      const heading=document.createElement('p');heading.textContent='请完成安全验证';
      const cancelButton=document.createElement('button');cancelButton.type='button';cancelButton.className='button secondary';cancelButton.textContent='取消验证';
      frame.title='图形安全验证';frame.src='/auth-challenge.html#'+new URLSearchParams({appId:settings.appId,nonce});
      frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.referrerPolicy='same-origin';
      panel.append(heading,frame,cancelButton);form.append(panel);
      let done=false;const finish=(proof,error)=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',receive);panel.remove();if(stop===abort)stop=null;error?reject(Error(error)):resolve(proof);};
      const receive=event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.nonce!==nonce||event.data?.type!=='xiaobai-captcha')return;if(event.data.proof)finish(event.data.proof);else finish(null,event.data.error||'已取消验证');};
      const abort=()=>finish(null,'已取消验证');stop=abort;cancelButton.addEventListener('click',abort);panel.addEventListener('cancel',event=>{event.preventDefault();abort();});window.addEventListener('message',receive);
      const timer=setTimeout(()=>finish(null,'验证已超时，请重新点击发送验证码'),180000);
      frame.addEventListener('error',()=>finish(null,'验证页面未能加载，请稍后重试'));
      panel.showModal();
    });
  }
  return {verify,cancel};
}
