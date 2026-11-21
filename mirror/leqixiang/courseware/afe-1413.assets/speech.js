class OfflineSpeech {
 constructor(){this.model=null;this.loading=null;this.active=null;this.token=0;this.lastUrl=null}
 async load(status=()=>{}){
  if(this.model)return this.model;if(this.loading)return this.loading;
  this.loading=(async()=>{status('正在准备本地英语识别模型，首次可能需要约 10–30 秒，后续课程可复用缓存…');if(!window.Vosk)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='vendor/vosk.js';s.onload=resolve;s.onerror=()=>reject(Error('语音组件加载失败，请从乐启享重新打开课件。'));document.head.appendChild(s)});
   const model=await new Promise((resolve,reject)=>{const m=new Vosk.Model(new URL('models/english-small.tar.gz',document.baseURI).href,0);const fail=message=>{clearTimeout(timer);m.terminate();m.worker?.terminate();reject(Error(message))};const timer=setTimeout(()=>fail('模型加载超时，可继续录音或用文字练习。请重新打开页面后重试识别。'),90000);m.on('load',event=>{if(event.result){clearTimeout(timer);resolve(m)}else fail('本地模型未能加载')});m.on('error',e=>fail('离线语音错误：'+(e.error||'模型或浏览器组件未就绪')));m.worker?.addEventListener('error',e=>fail('语音组件错误：'+e.message))});this.model=model;status('离线英语模型已就绪。');return model;
  })();try{return await this.loading}catch(e){this.loading=null;throw e}
 }
 async start({onStatus,onText,onRecording}){
  if(this.active||this.starting)throw Error('已有录音正在进行或准备中');
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('当前环境不能录音。请从乐启享的独立课件窗口打开，并允许麦克风；也可以输入英语继续。');
  const token=++this.token;this.starting=token;
  let stream=null,ctx=null,rec=null,source=null,processor=null,mute=null,mr=null,started=false;
  let permissionTimer=null,audioTimer=null,permissionExpired=false;
  try{
   let model=null;try{model=await this.load(onStatus)}catch(e){onStatus(e.message+' 本轮改为录音回听。')}
   if(token!==this.token)return false;
   onStatus('请在浏览器提示中允许麦克风；若没有提示，请检查地址栏和系统麦克风权限。');
   stream=await new Promise((resolve,reject)=>{
    permissionTimer=setTimeout(()=>{permissionExpired=true;reject(Error('麦克风授权尚未完成。请确认浏览器及系统麦克风权限后，再点击录音。'))},30000);
    Promise.resolve().then(()=>navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1},video:false})).then(value=>{
     clearTimeout(permissionTimer);
     if(permissionExpired||token!==this.token){value.getTracks().forEach(t=>t.stop());resolve(null);return}
     resolve(value);
    },error=>{clearTimeout(permissionTimer);reject(error)});
   });
   if(!stream||token!==this.token)return false;
   onStatus('正在启动录音，请稍候…');
   ctx=new AudioContext();
   await new Promise((resolve,reject)=>{
    audioTimer=setTimeout(()=>reject(Error('浏览器音频尚未启动，请再点击一次录音。麦克风已释放。')),10000);
    Promise.resolve(ctx.resume()).then(resolve,reject);
   });
   clearTimeout(audioTimer);
   if(token!==this.token)return false;
   rec=model?new model.KaldiRecognizer(ctx.sampleRate):null;let text='';
   if(rec){rec.on('result',m=>{if(token!==this.token)return;if(m.result.text)text+=(text?' ':'')+m.result.text;onText(text)});rec.on('partialresult',m=>{if(token===this.token)onText([text,m.result.partial].filter(Boolean).join(' '))})}
   source=ctx.createMediaStreamSource(stream);processor=ctx.createScriptProcessor(4096,1,1);mute=ctx.createGain();mute.gain.value=0;source.connect(processor);processor.connect(mute);mute.connect(ctx.destination);processor.onaudioprocess=e=>{if(rec)rec.acceptWaveform(e.inputBuffer)};
   const type=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));mr=new MediaRecorder(stream,type?{mimeType:type}:{});const chunks=[];mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};mr.onstop=()=>{if(token!==this.token)return;const blob=new Blob(chunks,{type:mr.mimeType});if(this.lastUrl)URL.revokeObjectURL(this.lastUrl);this.lastUrl=URL.createObjectURL(blob);onRecording({url:this.lastUrl,blob,extension:mr.mimeType.includes('mp4')?'m4a':'webm'})};mr.start();
   this.active={ctx,stream,rec,source,processor,mute,mr,onStatus,token};this.active.timer=setTimeout(()=>this.stop(),30000);started=true;
   onStatus(model?'正在录音并离线识别。说完后点击“结束录音”，最长 30 秒。':'正在录音。结束后可回听，再自行输入或与同伴确认内容。');return true;
  }finally{
   clearTimeout(permissionTimer);clearTimeout(audioTimer);if(this.starting===token)this.starting=null;
   if(!started){
    if(processor)processor.onaudioprocess=null;
    for(const node of [source,processor,mute])try{node?.disconnect()}catch{}
    try{if(mr&&mr.state!=='inactive')mr.stop()}catch{}
    try{rec?.remove()}catch{}
    stream?.getTracks().forEach(t=>t.stop());
    if(ctx)try{await ctx.close()}catch{}
   }
  }
 }
 async stop(){const a=this.active;if(!a)return;if(a.stopping)return a.stopping;a.stopping=(async()=>{clearTimeout(a.timer);a.processor.onaudioprocess=null;a.source.disconnect();a.processor.disconnect();a.mute.disconnect();if(a.mr.state!=='inactive')a.mr.stop();a.stream.getTracks().forEach(t=>t.stop());await a.ctx.close();a.onStatus('正在整理本轮识别文字…');if(a.rec){await new Promise(resolve=>{let quiet;const finish=()=>{clearTimeout(quiet);clearTimeout(limit);a.rec.removeEventListener('result',onResult);resolve()};const onResult=()=>{clearTimeout(quiet);quiet=setTimeout(finish,800)};const limit=setTimeout(finish,8000);a.rec.addEventListener('result',onResult);a.rec.retrieveFinalResult()});a.rec.remove()}if(this.active===a)this.active=null;a.onStatus('录音已结束。请核对识别文字，再提交；识别结果不是发音评分。')})();return a.stopping}
 async cancel(){await this.stop();this.token++;if(this.lastUrl){URL.revokeObjectURL(this.lastUrl);this.lastUrl=null}}
 async transcribeFile(url){const model=await this.load(),ctx=new AudioContext();await ctx.resume();const buffer=await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer()),rec=new model.KaldiRecognizer(buffer.sampleRate);let final='',flushing=false;return new Promise((resolve,reject)=>{const clean=()=>{clearTimeout(timer);rec.remove();ctx.close()};const timer=setTimeout(()=>{clean();reject(Error('离线音频识别超时'))},60000);const flush=()=>{if(!flushing){flushing=true;rec.retrieveFinalResult()}};rec.on('error',m=>{clean();reject(Error(m.error))});rec.on('partialresult',flush);rec.on('result',m=>{if(m.result.text)final+=(final?' ':'')+m.result.text;if(flushing){clean();resolve(final)}else flush()});rec.acceptWaveform(buffer)})}
}
