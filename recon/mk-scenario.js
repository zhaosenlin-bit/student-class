const fs=require('fs');
const p='C:/kaifa/xiaobai-class/recon/scenarios/local-xb-lesson.json';
let s=fs.readFileSync(p,'utf8');
s=s.replace('http://localhost:4173/#play/mirror','http://localhost:4173/#catalog');
fs.writeFileSync('C:/kaifa/xiaobai-class/recon/scenarios/local-xb-catalog.json',s,'utf8');
