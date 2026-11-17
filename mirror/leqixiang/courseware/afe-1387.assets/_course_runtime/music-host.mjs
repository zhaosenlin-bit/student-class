import {createPacedAssetFetch} from './asset-loader.mjs';
import {createMusicModel,fromBase64,digest} from './music-model.mjs';
export async function createMusicHost(win,port,{root,client}){
 const doc=win.document,originalFetch=win.fetch.bind(win),drafts=new Map();let model,statusNode,panel,backupText,importText,notice,preferBackup,stopped=false;
 const assets=createPacedAssetFetch(originalFetch);
 const show=message=>{if(statusNode)statusNode.textContent=message;};
 model=await createMusicModel({storage:client.storage,flush:()=>client.flush(),onStatus:s=>{
  const count=(s.omitted?.library.length||0)+(s.omitted?.learning.length||0);
  show(s.error||(count?`${count}项较大记录需学习备份`:'小容量记录已自动保存'));
 }});
 // The opaque website iframe has no disk API. Keep course drafts in its own memory,
 // and persist only the bounded course state through the existing authenticated bridge.
 const local={getItem(key){return key==='atelier-language'?model.state().language:drafts.get(String(key))??null;},setItem(key,value){if(key==='atelier-language')void model.language(String(value)).catch(()=>show('语言设置尚未保存'));else if(String(key).startsWith('atelier-learning-draft:')&&String(value).length<=1000000)drafts.set(String(key),String(value));},removeItem:key=>drafts.delete(String(key)),clear:()=>drafts.clear(),key:i=>[...drafts.keys()][i]??null,get length(){return drafts.size;}};
 Object.defineProperty(win,'localStorage',{configurable:true,value:local});
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 win.fetch=async(input,options={})=>{
  const raw=input instanceof Request?input.url:String(input),url=new URL(raw,win.location.href),path=url.pathname,method=(options.method||input?.method||'GET').toUpperCase();
  const logical=raw.startsWith('/api/')||raw.startsWith('/audio/')||raw.startsWith('/midi/');
  try{
   if(logical&&path.startsWith('/api/library')){
    const m=/^\/api\/library\/([a-f0-9]{64})(\/restore)?$/.exec(path);
    if(path==='/api/library'&&method==='GET')return json(model.list());
    if(path==='/api/library'&&method==='POST')return json(await model.saveMidi(JSON.parse(options.body)));
    if(m&&method==='GET'&&!m[2])return new Response(model.readMidi(m[1]),{headers:{'Content-Type':'audio/midi'}});
    if(m&&method==='DELETE'&&!m[2])return json(await model.trash(m[1]));
    if(m&&method==='POST'&&m[2])return json(await model.trash(m[1],true));
    return json({error:'曲谱库操作不存在'},404);
   }
   if(logical&&path.startsWith('/api/learning')){
    const m=/^\/api\/learning\/([a-f0-9]{64})$/.exec(path);if(!m)return json({error:'教学记录不存在'},404);
    if(method==='GET')return json(model.readLearning(m[1]));
    if(method==='PUT'){const b=JSON.parse(options.body);return json(await model.writeLearning(m[1],b.revision,b.document));}
    return json({error:'不支持此操作'},405);
   }
   if(logical&&/^\/audio\/[A-G](?:s)?[0-8]\.mp3$/.test(path))return assets.fetch(new URL(path.slice(1),root),options);
   if(logical&&/^\/midi\/[a-z0-9-]+\.mid$/.test(path)){
    const response=await assets.fetch(new URL(path.slice(1)+'.json',root),options);if(!response.ok)return response;
    const b=await response.json(),bytes=fromBase64(b.base64);if(bytes.length>2000000||await digest(bytes)!==b.sha256)throw Error('内置曲谱校验失败');return new Response(bytes,{headers:{'Content-Type':'audio/midi'}});
   }
   return originalFetch(input,options);
  }catch(e){return json({error:e.message||'操作失败，请保留页面并备份'},e.status||400);}
 };
 function element(tag,text){const e=doc.createElement(tag);if(text)e.textContent=text;return e;}
 const tools=element('aside');tools.id='music-web-tools';const open=element('button','学习备份');open.type='button';statusNode=element('span','记录保存在本机浏览器');statusNode.setAttribute('role','status');tools.append(open,statusNode);doc.body.append(tools);
 panel=element('dialog');panel.id='music-backup-panel';
 const title=element('h2','学习备份'),intro=element('p','小容量记录保存在本机浏览器。较大曲谱或换设备时，请复制完整备份文本保存在本地；也可粘贴或选择备份文件恢复。请自行保留原始 MIDI。');
 backupText=element('textarea');backupText.readOnly=true;backupText.setAttribute('aria-label','完整学习备份文本');backupText.spellcheck=false;
 const copy=element('button','选择并复制备份文本'),close=element('button','关闭'),refresh=element('button','更新备份文本');
 const exportText=async()=>{backupText.value=await model.exportBackup();notice.textContent='备份包含当前曲谱、回收站、教师修正和练习记录。复制后请保存在本地文本文件中。';};
 open.onclick=()=>{panel.showModal();void exportText().catch(e=>{notice.textContent=e.message;});};
 close.onclick=()=>panel.close();refresh.onclick=()=>void exportText();
 copy.onclick=()=>{backupText.focus();backupText.select();let ok=false;try{ok=doc.execCommand('copy');}catch{}notice.textContent=ok?'已复制，请粘贴到本地文本文件保存。':'文本已全选，请按⌘C（Mac）或Ctrl+C（Windows），再粘贴到本地文本文件保存。';};
 const imports=element('h3','恢复学习备份'),file=element('input');file.type='file';file.accept='.json,.txt,application/json,text/plain';file.setAttribute('aria-label','选择学习备份文件');
 importText=element('textarea');importText.placeholder='也可以在这里粘贴完整备份文本';importText.setAttribute('aria-label','待恢复的学习备份');importText.spellcheck=false;
 const pref=element('label');preferBackup=element('input');preferBackup.type='checkbox';pref.append(preferBackup,doc.createTextNode('同曲记录以备份为准（建议先复制当前备份）'));
 file.onchange=async()=>{const f=file.files?.[0];if(!f)return;if(f.size>24*1024*1024){notice.textContent='备份文件最大24MB';return;}importText.value=await f.text();};
 const restore=element('button','导入学习备份');restore.onclick=async()=>{restore.disabled=true;try{const r=await model.importBackup(importText.value,{preferBackup:preferBackup.checked});notice.textContent=`已导入${r.added}项，保留${r.kept}项当前记录。请关闭后重新打开作品，读取恢复后的曲谱和进度。`;backupText.value=await model.exportBackup();}catch(e){notice.textContent=e.message;}finally{restore.disabled=false;}};
 notice=element('p');notice.setAttribute('role','status');const buttons=element('div');buttons.className='music-backup-actions';buttons.append(copy,refresh,close);panel.append(title,intro,backupText,buttons,imports,file,importText,pref,restore,notice);doc.body.append(panel);
 const click=e=>{const a=e.target?.closest?.('a');if(!a)return;if(a.classList.contains('brand')){e.preventDefault();e.stopImmediatePropagation();return;}if(/^\/api\/library\/[a-f0-9]{64}$/.test(a.getAttribute('href')||'')){e.preventDefault();e.stopImmediatePropagation();open.click();}};
 doc.addEventListener('click',click,true);
 // Respect browser gesture-based audio start; pausing stops active WebAudio contexts.
 const contexts=new Set(),pausedContexts=new Set(),OriginalAudio=win.AudioContext||win.webkitAudioContext;
 if(OriginalAudio){class CourseAudio extends OriginalAudio{constructor(...args){super(...args);contexts.add(this);}}win.AudioContext=CourseAudio;if(win.webkitAudioContext)win.webkitAudioContext=CourseAudio;}
 win.__VINEXT_RSC_BOOTSTRAP_STATE__='course-static';
 return {async checkpoint(){await model.checkpoint();},async pause(){for(const c of contexts)if(c.state==='running')pausedContexts.add(c);await Promise.all([...pausedContexts].filter(c=>c.state==='running').map(c=>c.suspend()));},async resume(){for(const c of pausedContexts)if(c.state==='suspended')await c.resume();pausedContexts.clear();},syncSettings(){},dispose(){if(stopped)return;stopped=true;assets.close();for(const c of contexts)void c.close().catch(()=>{});doc.removeEventListener('click',click,true);},};
}
