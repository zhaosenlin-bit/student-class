// Keep an approved device lesson away from the main-site origin and credentials.
export function mountMicrophoneViewer(course,launch,onClose){
 const validate=entry=>{const url=new URL(entry);
 const deviceOrigin={'https://testdeploy.localhost':'https://testplay.localhost','/':'https://play.localhost'}[location.origin];
 if(!deviceOrigin||url.origin!==deviceOrigin||url.pathname!=='/premium-microphone/start'||url.username||url.password||url.search)throw Error('麦克风运行入口无效');return url;};
 validate(launch.microphoneEntry);
 const viewer=document.createElement('div');viewer.id='program-viewer';viewer.className='viewer-overlay show';
 const header=document.createElement('div');header.className='viewer-header';
 const title=document.createElement('div');title.className='viewer-title';title.textContent=course.title;
 const close=document.createElement('button');close.className='viewer-close-btn';close.textContent='✕';close.onclick=()=>onClose();header.append(title,close);
 const panel=document.createElement('div');panel.style.cssText='margin:auto;padding:32px;max-width:620px;color:#172c29;background:#fff;border-radius:18px;line-height:1.8';
 const heading=document.createElement('h2');heading.textContent='打开声音实验室';
 const detail=document.createElement('p');detail.textContent='本课件包含真实麦克风实验，将在独立窗口打开。点击课件内“开启麦克风”后，由您决定是否允许。音频仅在本机分析，不上传。';
 const count=document.createElement('p');count.textContent=launch.accessType==='premium_sample'?'本次免费体验已计入，打开窗口和刷新不会再次扣次。':'已获得本课件使用权限。';
 const hint=document.createElement('p');hint.textContent='请保留此页面；关闭此播放器将结束本次实验；若浏览器保留实验标签页，可手动关闭。';
 const button=document.createElement('button');button.className='btn btn-primary';button.textContent='打开实验窗口';
 const retry=document.createElement('button');retry.className='btn';retry.textContent='连接失败？重试';
 let popup=null,disposed=false,busy=false;
 const open=async force=>{
  if(disposed||busy)return;
  if(popup&&!popup.closed&&!force){popup.focus();return;}
  if(popup&&!popup.closed)popup.close();
  popup=window.open('about:blank','_blank');
  if(!popup){hint.textContent='浏览器阻止了新窗口，请允许本站弹出窗口后重试，不会重复扣次。';return;}
  popup.opener=null;busy=true;button.disabled=true;retry.disabled=true;
  try{const fresh=await launch.refreshMicrophone();const url=validate(fresh.microphoneEntry);if(disposed)return;popup.location.replace(url.href);button.textContent='返回实验窗口';hint.textContent='请保留此页面；若连接失败，可在这里重试，不会重复扣次。';}
  catch{if(popup&&!popup.closed)popup.close();popup=null;hint.textContent='暂时无法连接，请点击重试。本页重试沿用本次使用，不会重复扣次。';}
  finally{busy=false;button.disabled=false;retry.disabled=false;}
 };
 button.onclick=()=>open(false);retry.onclick=()=>open(true);
 panel.append(heading,detail,count,button,retry,hint);viewer.append(header,panel);document.body.append(viewer);
 // Closing an experiment window preserves this lease for safe retry. The main
 // viewer close button remains the explicit end of this counted use.
 const timer=setInterval(()=>{if(popup?.closed){popup=null;button.textContent='重新打开实验窗口';}},1000);
 const stop=()=>{if(disposed)return;disposed=true;clearInterval(timer);if(popup&&!popup.closed)popup.close();};
 addEventListener('pagehide',stop,{once:true});
 return ()=>{stop();removeEventListener('pagehide',stop);};
}
