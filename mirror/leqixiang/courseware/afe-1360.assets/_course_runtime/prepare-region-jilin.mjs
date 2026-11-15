import {prepareTerrain} from './terrain-data.mjs';
try { await prepareTerrain(new URL('../province-terrain-samples/data/jilin.terrain.json', import.meta.url)); } catch(error) { const box=document.querySelector('#loading'); if(box) box.textContent='地形数据载入失败，请重新打开课件后重试。'; throw error; }
