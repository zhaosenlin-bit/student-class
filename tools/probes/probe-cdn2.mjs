#!/usr/bin/env node
const urls=[
 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.woff2',
 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js',
 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2/MathJax_Zero.woff',
];
for(const u of urls){
  for(let i=0;i<4;i++){
    try{ const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/157.0.0.0'}});
      console.log(r.status,u.split('/').slice(-2).join('/'),r.headers.get('content-length'));
      if(r.ok){ await r.arrayBuffer(); break; }
    }catch(e){ console.log('ERR try'+i,u.split('/').slice(-1)[0],e.message, e.cause&&e.cause.code); }
    await new Promise(r=>setTimeout(r,3000));
  }
  await new Promise(r=>setTimeout(r,2000));
}
