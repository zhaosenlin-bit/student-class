// Bounded gzip geometry + reviewed JSON values. Never evaluate downloaded text.
const MiB=1024*1024;
const names=new Set(['REGION_INFO','TERRAIN_CATALOG','TERRAIN_PAYLOADS','REGION_LESSONS','COURSE_DATA','CHINA_OUTLINE','LANDFORM_MASKS','HYDRO_DATA']);
const check=(condition)=>{if(!condition)throw Error('TERRAIN_DATA_INVALID');};
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
async function bounded(stream,expected,max){
 check(Number.isSafeInteger(expected)&&expected>0&&expected<=max&&stream);
 const result=new Uint8Array(expected),reader=stream.getReader();let offset=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;check(value&&offset+value.byteLength<=expected);result.set(value,offset);offset+=value.byteLength;}check(offset===expected);return result;}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
}
export async function decodeDataset(manifestURL){
 const r=await fetch(manifestURL);check(r.ok);
 const bytes=await r.arrayBuffer();check(bytes.byteLength<=32768);
 const m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 check(m.schema==='shanhe-terrain-data/v1'&&Number.isSafeInteger(m.bytes)&&m.bytes>0&&m.bytes<100*MiB&&Array.isArray(m.chunks)&&m.chunks.length>0&&m.chunks.length<=8&&Array.isArray(m.fields)&&m.fields.length<=5);
 const data=new Uint8Array(m.bytes);let offset=0;
 for(const c of m.chunks){
  check(/^[a-z0-9-]+\.terrain\.gz$/.test(c.path)&&c.offset===offset);
  const response=await fetch(new URL(c.path,manifestURL));check(response.ok);
  const encoded=await bounded(response.body,c.bytes,16*MiB);check(await digest(encoded)===c.sha256);
  check(typeof DecompressionStream==='function');
  const raw=await bounded(new Blob([encoded]).stream().pipeThrough(new DecompressionStream('gzip')),c.decodedBytes,64*MiB);
  check(await digest(raw)===c.decodedSha256&&offset+raw.length<=data.length);data.set(raw,offset);offset+=raw.length;
 }
 check(offset===m.bytes&&await digest(data)===m.sha256);
 const result={h:null,w:null,l:null,q:null};const seen=new Set();offset=0;
 for(const f of m.fields){
  check(['globals','height','water','land','quality'].includes(f.key)&&!seen.has(f.key)&&f.offset===offset&&Number.isSafeInteger(f.bytes)&&f.bytes>0&&offset+f.bytes<=data.length);seen.add(f.key);
  let value=data.slice(offset,offset+f.bytes);offset+=f.bytes;
  if(f.key==='height'&&f.encoding==='f32le-xor-byteplanes-v1'){
   check(value.length%4===0);const n=value.length/4,result=new Uint8Array(value.length),view=new DataView(result.buffer);let previous=0;
   for(let i=0;i<n;i++){const delta=(value[i]|value[n+i]<<8|value[2*n+i]<<16|value[3*n+i]<<24)>>>0;previous=(previous^delta)>>>0;view.setUint32(i*4,previous,true);}
   value=result;
  }else check(!f.encoding||f.encoding==='identity');
  check(await digest(value)===f.sha256);
  if(f.key==='globals'){
   const rows=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(value));check(Array.isArray(rows)&&rows.length<=names.size);const keys=new Set();
   for(const row of rows){check(Array.isArray(row)&&row.length===2&&names.has(row[0])&&!keys.has(row[0]));keys.add(row[0]);}
   result.globals=rows;
  }else if(f.key==='height'){check(value.length%4===0&&new Uint8Array(new Uint32Array([1]).buffer)[0]===1);result.h=new Float32Array(value.buffer);}
  else result[{water:'w',land:'l',quality:'q'}[f.key]]=value;
 }
 check(offset===data.length&&result.h);for(const k of ['w','l','q'])check(!result[k]||result[k].length===result.h.length);
 return result;
}
export async function prepareTerrain(mainURL){
 const main=await decodeDataset(mainURL);check(main.globals);
 for(const [key,value]of main.globals)window[key]=value;delete main.globals;
 const catalog=window.TERRAIN_CATALOG;check(Array.isArray(catalog?.datasets)&&catalog.datasets.length>=2&&catalog.datasets.length<=3);
 const cache=new Map([['china',Promise.resolve(main)]]);
 window.__shanheLoadTerrain=id=>{
  const item=catalog.datasets.find(d=>d.id===id);check(item&&/^[a-z]+(?:-detail)?$/.test(item.fileKey||id));
  if(!cache.has(id)){
   const pending=decodeDataset(new URL((item.fileKey||id)+'.terrain.json',mainURL)).then(data=>{check(!data.globals);return data;}).catch(error=>{cache.delete(id);throw error;});cache.set(id,pending);
  }
  return cache.get(id).then(data=>{check(Number.isSafeInteger(item.width)&&Number.isSafeInteger(item.height)&&data.h.length===item.width*item.height);return data;});
 };
}
