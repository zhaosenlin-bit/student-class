import {createGraphChallenge} from './graph-auth.js?v=20261019';
export function createPhoneAuth({api,esc,getUser,modal,close,toast,onLogin,onVerified,phoneOnly=false,graphChallenge=createGraphChallenge()}) {
  let status={enabled:false,bound:false,phoneMasked:null},flow=null,countdown=null,openSerial=0;
  const onlyPhone=()=>phoneOnly||status.phoneOnly===true;
  const support=()=>status.support?`<p class="subtle">原手机号无法使用时，请联系售后：${esc(status.support)}</p>`:'<p class="subtle">原手机号无法使用时，请联系售后核验账号。</p>';
  async function refresh(){try{status=await api('/api/auth/phone/status');}catch{status={enabled:false,bound:false,phoneMasked:null};}return status;}
  function stopCountdown(){clearInterval(countdown);countdown=null;}
  function sendLabel(button,until){stopCountdown();const tick=()=>{if(!button.isConnected){stopCountdown();return;}const seconds=Math.max(0,Math.ceil((until-Date.now())/1000));button.disabled=seconds>0;button.textContent=seconds?`${seconds} 秒后重发`:'重新发送';if(!seconds)stopCountdown();};tick();countdown=setInterval(tick,1000);}
  function draw(purpose,{target=null,rebindToken=null}={}) {
    if(!status.enabled){
      if(onlyPhone())modal('<div class="dialog-content"><h2>手机号登录</h2><p>短信服务暂不可用，请稍后重试。已登录的账号可以继续使用。</p>'+support()+'<button class="button wide" data-action="login">重新检查</button></div>');
      else toast('短信服务尚未开通，请使用账号密码登录或联系售后');
      return;
    }
    graphChallenge.cancel();stopCountdown();flow={purpose,target,rebindToken,challengeId:null,revision:0};
    const login=purpose==='login',bind=purpose==='bind',old=purpose==='rebind_old',safety=purpose==='safety',needsPhone=login||bind||purpose==='rebind_new';
    const title=login?'手机号登录':bind?'绑定手机号':old?'验证原手机号':purpose==='rebind_new'?'设置新手机号':'确认账号归属';
    const explanation=login?(onlyPhone()?'首次验证通过后自动注册，无需设置密码。':'验证码登录；首次登录会创建个人账号。已有购买记录请先用原账号密码登录，再绑定手机号。'):bind?'绑定到当前账号，保留已有课件与订单。':old?'先验证原手机号，再验证新手机号。换绑后其他设备需要重新登录，请在结束课堂后操作。':safety?'请验证绑定手机号后，在这个浏览器继续开课。验证期间其他课堂保持原状。':'新手机号验证成功后，替换原绑定手机号，其他设备需要重新登录。';
    modal(`<form class="form phone-form" data-phone-form="${purpose}"><p class="eyebrow">小白教育 · 账号</p><h2>${title}</h2><p class="subtle">${explanation}</p>${needsPhone?'<label for="phone-number">手机号</label><input id="phone-number" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" required pattern="1[3-9][0-9]{9}" maxlength="11" placeholder="11 位中国大陆手机号">':`<div class="phone-bound">${esc(status.phoneMasked||'已绑定手机号')}</div>`}${(bind||old)&&!onlyPhone()?'<label for="phone-password">当前账号密码</label><input id="phone-password" name="password" type="password" required autocomplete="current-password" maxlength="128">':''}${old&&!onlyPhone()&&/^phone_[a-f0-9]+$/.test(getUser()?.username||'')?'<p class="subtle">如尚未设置密码，请先用保存的恢复码，在“忘记密码”中设置密码。</p>':''}<label for="phone-code">短信验证码</label><div class="phone-code-row"><input id="phone-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6}" minlength="6" maxlength="6" placeholder="6 位验证码"><button class="button secondary" type="button" data-phone-send>发送验证码</button></div>${login?'<label class="check-label"><input type="checkbox" name="adult" required><span>我是成年教师或家长，已阅读<a href="#privacy" data-action="privacy">隐私说明</a>与<a href="#terms" data-action="terms">购买说明</a>。</span></label>':''}<p class="phone-send-status subtle" role="status"></p><p class="error" data-phone-error role="alert"></p><button class="button wide" type="submit">${login?'登录':old?'验证并继续':safety?'验证并继续开课':'确认绑定'}</button>${login?(!onlyPhone()?'<div class="form-switch"><button type="button" data-action="login">使用账号密码</button></div>':''):support()}</form>`);
  }
  function cancel(){openSerial++;flow=null;graphChallenge.cancel();stopCountdown();}
  async function open(purpose,options){const serial=++openSerial;await refresh();if(serial===openSerial)draw(purpose,options);}
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-phone-send]');if(!button)return;
    const form=button.closest('[data-phone-form]'),active=flow;if(!form||!active||button.disabled)return;
    const error=form.querySelector('[data-phone-error]');error.textContent='';
    const phone=form.elements.phone,password=form.elements.password;
    if(phone&&!phone.reportValidity())return;if(password&&!password.reportValidity())return;
    if(form.elements.adult&&!form.elements.adult.reportValidity())return;
    button.disabled=true;const revision=active.revision;
    const sendBody={purpose:active.purpose,...(phone?{phone:phone.value}:{}),...(password?{password:password.value}:{}),...(active.rebindToken?{rebindToken:active.rebindToken}:{})};
    try{if(status.captcha?.required){button.textContent='安全验证中';const proof=await graphChallenge.verify(status.captcha,form);if(!form.isConnected||flow!==active||active.revision!==revision)return;sendBody.captcha=proof;}const result=await api('/api/auth/phone/send',sendBody);if(!form.isConnected||flow!==active)return;if(active.revision!==revision){button.disabled=false;error.textContent='账号资料已修改，请重新发送验证码。';return;}active.challengeId=result.challengeId;form.querySelector('.phone-send-status').textContent=`验证码已发送至 ${result.phoneMasked||'你的手机号'}，${Math.ceil((result.expiresIn||300)/60)} 分钟内有效。`;sendLabel(button,Date.now()+Math.max(1,result.retryAfter||60)*1000);}
    catch(err){if(form.isConnected&&flow===active){error.textContent=err.message;button.disabled=false;button.textContent='发送验证码';}}
  });
  document.addEventListener('submit',async event=>{
    const form=event.target;if(!form.matches('[data-phone-form]'))return;event.preventDefault();
    const active=flow,button=form.querySelector('[type="submit"]'),error=form.querySelector('[data-phone-error]');if(!active)return;error.textContent='';
    if(!active.challengeId){error.textContent='请先发送验证码。';return;}button.disabled=true;
    const values=Object.fromEntries(new FormData(form)),body={challengeId:active.challengeId,code:values.code};
    try{
      if(active.purpose==='login'){const result=await api('/api/auth/phone/login',{...body,adult:values.adult==='on'});if(flow!==active||!form.isConnected)return;close();await onLogin(result);await refresh();}
      else if(active.purpose==='rebind_old'){const result=await api('/api/auth/phone/rebind-old',body);if(flow!==active||!form.isConnected)return;draw('rebind_new',{rebindToken:result.rebindToken});}
      else if(active.purpose==='safety'){await api('/api/auth/phone/safety',body);if(flow!==active||!form.isConnected)return;close();toast('验证通过，可继续使用');await onVerified(active.target);}
      else {await api(active.purpose==='bind'?'/api/auth/phone/bind':'/api/auth/phone/rebind',{...body,...(active.purpose==='bind'?{password:values.password}:{rebindToken:active.rebindToken})});if(flow!==active||!form.isConnected)return;close();await refresh();toast(active.purpose==='bind'?'手机号已绑定，原有课件与订单保留':'手机号已更新');}
    }catch(err){if(form.isConnected&&flow===active)error.textContent=err.message;}finally{if(form.isConnected)button.disabled=false;}
  });
  document.addEventListener('input',event=>{const form=event.target.closest('[data-phone-form]');if(!form||!flow||!['phone','password'].includes(event.target.name))return;flow.revision++;flow.challengeId=null;graphChallenge.cancel();stopCountdown();const button=form.querySelector('[data-phone-send]');button.disabled=false;button.textContent='发送验证码';form.querySelector('.phone-send-status').textContent='';});
  return {refresh,open,cancel,get enabled(){return status.enabled===true;},get bound(){return status.bound===true;},get phoneMasked(){return status.phoneMasked;}};
}
