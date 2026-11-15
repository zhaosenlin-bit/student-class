#!/usr/bin/env node
const urls=[
 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.woff2',
 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.woff',
 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.ttf',
 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2/MathJax_Zero.woff',
 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2/MathJax_Main-Regular.woff',
 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js',
 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
];
for(const u of urls){
  try{ const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'}}); const t=r.headers.get('content-length')||''; console.log(r.status,u.split('/').slice(-2).join('/'),t); }
  catch(e){ console.log('ERR',u,e.message); }
}
