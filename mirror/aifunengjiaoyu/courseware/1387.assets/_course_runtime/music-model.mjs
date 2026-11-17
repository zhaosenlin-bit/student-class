import {parseMidi} from './midi-parser.mjs';
import {validate as validateLearning} from './learning-validation.mjs';
export const STATE_KEYS=Array.from({length:8},(_,i)=>'music.state.'+i);
export const META_KEY='music.state.meta';
const enc=new TextEncoder(), dec=new TextDecoder('utf-8',{fatal:true});
const MAX_RAW=6*1024*1024, MAX_BACKUP=24*1024*1024, MAX_B64=8*3800;
const own=o=>o&&Object.getPrototypeOf(o)===Object.prototype;
const idOk=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
const fail=message=>{throw Error(message);};
export function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
export function fromBase64(s){if(typeof s!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))fail('备份编码无效');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
export async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');}
const clone=x=>JSON.parse(JSON.stringify(x));
const empty=()=>({version:1,language:'zh',library:{},learning:{}});
export async function checkMidi(input){
 if(!own(input)||typeof input.name!=='string'||!/\.(mid|midi)$/i.test(input.name)||/[\\/\x00-\x1f]/.test(input.name)||input.name.length>200)fail('请选择文件名有效的 MIDI 文件');
 if(typeof input.data!=='string'||input.data.length>2666668)fail('MIDI 最大2MB');
 const bytes=fromBase64(input.data);if(bytes.length<14||bytes.length>2000000||dec.decode(bytes.subarray(0,4))!=='MThd')fail('MIDI 文件无效');
 if((bytes[10]*256+bytes[11])>256)fail('MIDI 音轨过多');
 let parsed;try{parsed=parseMidi(bytes);}catch{fail('MIDI 文件无效');}
 let notes=0,events=0;for(const t of parsed.tracks){events+=t.length;for(const e of t)if(e.type==='noteOn'&&e.velocity>0)notes++;}
 if(!notes||notes>20000||events>100000||!Number.isFinite(input.duration)||input.duration<=0||input.duration>1200||!Number.isInteger(input.noteCount)||input.noteCount<1||input.noteCount>notes)fail('曲谱最多20分钟、20,000个音符；音符统计需有效');
 return {bytes,id:await digest(bytes)};
}
function checkLearningRecord(id,r){
 if(!idOk(id)||!own(r)||!Number.isSafeInteger(r.revision)||r.revision<1||enc.encode(JSON.stringify(r)).length>1000000)fail('教学记录格式无效');
 validateLearning(r.document);if(typeof r.updatedAt!=='string'||!Number.isFinite(Date.parse(r.updatedAt)))fail('教学记录时间无效');
}
export async function validateState(s){
 if(!own(s)||s.version!==1||!['zh','en'].includes(s.language)||!own(s.library)||!own(s.learning)||Object.keys(s.library).length>100||Object.keys(s.learning).length>100)fail('学习备份格式无效');
 for(const [id,r]of Object.entries(s.library)){
  if(!idOk(id)||!own(r)||r.id!==id||typeof r.title!=='string'||r.title.length>200||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt))||(r.deletedAt!==null&&(typeof r.deletedAt!=='string'||!Number.isFinite(Date.parse(r.deletedAt)))))fail('曲谱记录无效');
  const checked=await checkMidi(r);if(checked.id!==id||checked.bytes.length!==r.size)fail('曲谱校验不一致');
 }
 for(const [id,r]of Object.entries(s.learning))checkLearningRecord(id,r);
 return clone(s);
}
async function transform(bytes,kind){
 const stream=new Blob([bytes]).stream().pipeThrough(kind==='gzip'?new CompressionStream('gzip'):new DecompressionStream('gzip'));
 const reader=stream.getReader(),chunks=[];let n=0;
 try{for(;;){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>MAX_RAW)fail('自动存档解压后过大');chunks.push(r.value);}}finally{await reader.cancel().catch(()=>{});}
 const out=new Uint8Array(n);let at=0;for(const c of chunks){out.set(c,at);at+=c.length;}return out;
}
async function encodeState(s){const raw=enc.encode(JSON.stringify(s));if(raw.length>MAX_RAW)return null;const bytes=await transform(raw,'gzip');const value=toBase64(bytes);return value.length<=MAX_B64?{value,hash:await digest(bytes),bytes:bytes.length}:null;}
export async function chooseAutomatic(s){
 const small=empty();small.language=s.language;const omitted={learning:[],library:[]};let encoded=await encodeState(s);
 if(encoded)return {state:s,encoded,omitted};
 // Prefer recent small teaching records. Never delete anything from the active session.
 for(const kind of ['learning','library'])for(const [id,r]of Object.entries(s[kind]).sort((a,b)=>(b[1].updatedAt||b[1].createdAt).localeCompare(a[1].updatedAt||a[1].createdAt))){
  small[kind][id]=r;if(!await encodeState(small)){delete small[kind][id];omitted[kind].push(id);}
 }
 encoded=await encodeState(small);if(!encoded)fail('自动存档容量不足');return {state:small,encoded,omitted};
}
export async function createMusicModel({storage,flush,onStatus=()=>{},now=()=>new Date().toISOString()}){
 let state=empty(),queue=Promise.resolve(),last={omitted:{learning:[],library:[]},automatic:true},failure=null;
 const rawMeta=storage.getItem(META_KEY);
 if(rawMeta!==null){
  let meta;try{meta=JSON.parse(rawMeta);}catch{fail('自动存档损坏，请保留当前浏览器数据');}
  if(!own(meta)||meta.version!==1||!Number.isInteger(meta.chunks)||meta.chunks<1||meta.chunks>8||!idOk(meta.sha256))fail('自动存档索引损坏');
  let value='';for(let i=0;i<meta.chunks;i++){const c=storage.getItem(STATE_KEYS[i]);if(typeof c!=='string'||!c.length||c.length>3800)fail('自动存档不完整');value+=c;}
  const bytes=fromBase64(value);if(await digest(bytes)!==meta.sha256)fail('自动存档校验失败');state=await validateState(JSON.parse(dec.decode(await transform(bytes,'ungzip'))));
 }
 async function persist(){
  const choice=await chooseAutomatic(state),value=choice.encoded.value,n=Math.ceil(value.length/3800);
  // One synchronous batch; the existing host commits the complete snapshot atomically.
  for(let i=0;i<8;i++){if(i<n)storage.setItem(STATE_KEYS[i],value.slice(i*3800,(i+1)*3800));else storage.removeItem(STATE_KEYS[i]);}
  storage.setItem(META_KEY,JSON.stringify({version:1,chunks:n,sha256:choice.encoded.hash}));
  await flush();failure=null;last={omitted:choice.omitted,automatic:!choice.omitted.learning.length&&!choice.omitted.library.length};onStatus(last);return last;
 }
 function update(fn){const task=queue.catch(()=>{}).then(async()=>{const next=clone(state),result=await fn(next);if(enc.encode(JSON.stringify(next)).length>MAX_BACKUP-2048)fail('当前学习库过大，请先备份并整理曲谱');state=next;try{const status=await persist();return {result,status};}catch(e){failure=e;onStatus({error:'自动保存尚未确认，请先复制学习备份再退出'});throw e;}});queue=task;return task;}
 const meta=({data,...r})=>r;
 return {
  state:()=>clone(state),status:()=>({...last,error:failure?.message}),
  list:()=>({active:Object.values(state.library).filter(r=>!r.deletedAt).map(meta),trash:Object.values(state.library).filter(r=>r.deletedAt).map(meta),damaged:0}),
  readMidi(id){if(!idOk(id)||!state.library[id]||state.library[id].deletedAt)fail('曲谱不存在，请导入原MIDI或学习备份');return fromBase64(state.library[id].data);},
  async saveMidi(input){const checked=await checkMidi(input);const {result,status}=await update(s=>{let r=s.library[checked.id];const restored=!!r?.deletedAt,duplicate=!!r&&!restored;if(r){r.deletedAt=null;}else{r={id:checked.id,title:input.name.replace(/\.(mid|midi)$/i,''),name:input.name,size:checked.bytes.length,duration:input.duration,noteCount:input.noteCount,createdAt:now(),deletedAt:null,data:input.data};s.library[r.id]=r;}return {item:meta(r),duplicate,restored};});return {...result,persistence:status.automatic?'automatic':'backup-needed'};},
  async trash(id,restore=false){const {result}=await update(s=>{if(!idOk(id)||!s.library[id])fail('曲谱不存在');s.library[id].deletedAt=restore?null:now();return meta(s.library[id]);});return result;},
  readLearning(id){if(!idOk(id))fail('曲谱标识无效');return clone(state.learning[id]||{revision:0,document:null});},
  async writeLearning(id,revision,document){
   const {result,status}=await update(s=>{const old=s.learning[id];if(!idOk(id)||!Number.isSafeInteger(revision)||revision!==(old?.revision||0)){const e=Error('另一窗口或备份已更新记录，请重新载入');e.status=409;throw e;}const r={revision:revision+1,document:clone(document),updatedAt:now()};checkLearningRecord(id,r);s.learning[id]=r;return r;});
   return {...result,persistence:status.omitted.learning.includes(id)?'backup-needed':'automatic'};
  },
  async language(value){if(!['zh','en'].includes(value))return;await update(s=>{s.language=value;});},
  async checkpoint(){await queue;if(failure)throw failure;await flush();},
  async exportBackup(){await queue.catch(()=>{});const content=clone(state);return JSON.stringify({schema:'leqixiang-music-backup/v1',savedAt:now(),sha256:await digest(enc.encode(JSON.stringify(content))),content},null,2);},
  async importBackup(text,{preferBackup=false}={}){
   if(typeof text!=='string'||enc.encode(text).length>MAX_BACKUP)fail('学习备份最大24MB');let b;try{b=JSON.parse(text);}catch{fail('请导入完整的学习备份文本');}
   if(b?.schema!=='leqixiang-music-backup/v1'||await digest(enc.encode(JSON.stringify(b.content)))!==b.sha256)fail('备份格式或校验不正确');const incoming=await validateState(b.content);
   const {result}=await update(s=>{let added=0,kept=0;for(const kind of ['library','learning'])for(const [id,r]of Object.entries(incoming[kind])){if(!s[kind][id]||preferBackup){if(kind==='learning'&&s[kind][id])r.revision=Math.max(r.revision,s[kind][id].revision)+1;s[kind][id]=r;added++;}else kept++;}if(preferBackup)s.language=incoming.language;return {added,kept};});return result;
  }
 };
}
