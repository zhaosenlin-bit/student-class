import * as THREE from '../../vendor/three.module.js';

export class MaterialSystem {
  constructor(renderer){this.renderer=renderer;this.cache=new Map();}
  async load(){
    const [cover,paper,spine,gold]=await Promise.all([
      this.#texture(new URL('../../assets/textures/book_cover_diffuse.png',import.meta.url).href,1,1),
      this.#texture(new URL('../../assets/textures/paper_texture.png',import.meta.url).href,2.5,3),
      this.#texture(new URL('../../assets/textures/spine_texture.png',import.meta.url).href,1,2),
      this.#texture(new URL('../../assets/textures/gold_pattern.png',import.meta.url).href,1,1)
    ]);
    const fiberNormal=this.#fiberNormal(),roughnessMap=this.#roughnessMap();
    return {
      cover:new THREE.MeshStandardMaterial({map:cover,normalMap:fiberNormal,normalScale:new THREE.Vector2(.18,.18),roughnessMap,roughness:.82,metalness:.02}),
      spine:new THREE.MeshStandardMaterial({map:spine,normalMap:fiberNormal,normalScale:new THREE.Vector2(.28,.28),roughnessMap,roughness:.88}),
      paper:new THREE.MeshStandardMaterial({map:paper,normalMap:fiberNormal,normalScale:new THREE.Vector2(.11,.11),roughnessMap,roughness:.94,side:THREE.DoubleSide}),
      edge:new THREE.MeshStandardMaterial({map:paper,color:0xd1bd90,normalMap:fiberNormal,normalScale:new THREE.Vector2(.2,.2),roughness:1}),
      gold:new THREE.MeshStandardMaterial({color:0xd6ac55,metalness:.68,roughness:.35,emissive:0x3b2506,emissiveIntensity:.18}),
      goldPattern:new THREE.MeshStandardMaterial({color:0xd7ae58,alphaMap:gold,transparent:true,opacity:.18,metalness:.76,roughness:.3,depthWrite:false})
    };
  }
  #texture(url,rx,ry){if(this.cache.has(url))return this.cache.get(url);const promise=new THREE.TextureLoader().loadAsync(url).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return t;});this.cache.set(url,promise);return promise;}
  #fiberNormal(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),img=x.createImageData(128,128);for(let i=0;i<img.data.length;i+=4){const n=((i/4*17)%13)-6;img.data[i]=128+n;img.data[i+1]=128-n;img.data[i+2]=245;img.data[i+3]=255;}x.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,8);return t;}
  #roughnessMap(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),img=x.createImageData(64,64);for(let i=0;i<img.data.length;i+=4){const v=205+(i*29%35);img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;}x.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,7);return t;}
}
